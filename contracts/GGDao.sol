//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "./NFTMarketplace.sol";

contract GGDao {
    event ProposalCreated(uint256 proposalId, address member);
    event NFTProposalCreated(
        uint256 proposalId,
        address member,
        address nftContract,
        uint256 nftId
    );
    event MemberAdded(address member);
    event ProposalExecuted(uint256 proposalId, address admin);
    event VoteCasted(address member, uint256 proposalId, uint8 vote);
    event NFTBought(uint256 nftId, address marketplace);

    string public constant CONTRACT_NAME = "GG DAO";

    bytes32 public constant DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,uint256 chainId,address verifyingContract)"
        );
    bytes32 public constant VOTE_TYPEHASH =
        keccak256("Vote(uint256 _proposalId,uint8 _vote)");

    struct Member {
        bool isVoter;
        uint256 joinedAt;
    }

    /// @dev isAdmin is deployer of the DAO and cannot be removed as admin. isExec are people that admin can add to execute proposals once they are approved
    struct Admin {
        bool isMaster;
        bool isExec;
    }

    /// @dev documented in readme
    enum ProposalStatus {
        NO_STATUS,
        IN_PROGRESS,
        PASSED,
        REJECTED, // rejected during voting
        EXECUTION_SUCCESS, // proposal is executed by admins
        EXECUTION_SUNSET
        // after 30 days, of proposal creation if proposal wasn't executed due to other contract errors or other admin reasons
        // then we sunset it, and a new proposal has to be created
    }

    enum ExecutionStatus {
        NO_STATUS,
        SUCCESS
    }

    uint8 private constant VOTE_STATUS_YES = 1;
    uint8 private constant VOTE_STATUS_NO = 2;

    mapping(address => uint8) private VoteTracker;

    /// @notice used to tally votes for a proposalId
    /// @dev  proposalId => address that voted => vote status
    /// @dev technically don't need to store vote status, but we are because we want the votes to be public and indesputable
    mapping(uint256 => mapping(address => uint8)) public votesTally;

    struct Proposal {
        // address nftId;
        // address contractAddress;
        uint256 createdAt;
        uint256 totalVotesCast; /// @dev = 25% quourum of total members at the time of creation
        uint256 yesVotesCast;
        ExecutionStatus executionStatus;
        uint256 memberSnapshot;
    }

    mapping(uint256 => Proposal) public proposals;

    mapping(address => Member) public members;
    mapping(address => Admin) public admins;

    address public NFT_MARKETPLACE;
    uint256 public memberCount;

    constructor(address _nftMarketplace) {
        admins[msg.sender].isMaster = true;
        NFT_MARKETPLACE = _nftMarketplace;
    }

    modifier onlyAdmin() {
        require(
            admins[msg.sender].isMaster == true ||
                admins[msg.sender].isExec == true,
            "ONLY_ADMIN"
        );
        _;
    }

    modifier onlyMember() {
        require(members[msg.sender].isVoter == true, "ONLY_FOR_MEMBERS");
        _;
    }

    modifier onlyMaster() {
        require(admins[msg.sender].isMaster == true, "ONLY_MASTER");
        _;
    }

    modifier cannotAlterMaster(address _account) {
        require(admins[_account].isMaster == false, "CANNOT_ALTER_MASTER");
        _;
    }

    function addAdmin(address _account)
        external
        onlyMaster
        cannotAlterMaster(_account)
    {
        admins[_account].isExec = true;
    }

    function removeAdmin(address _account)
        external
        onlyMaster
        cannotAlterMaster(_account)
    {
        admins[_account].isExec = false;
    }

    function becomeMember() external payable {
        require(msg.value == 1 ether, "MUST_CONTRIBUTE_1_ETH");
        require(members[msg.sender].isVoter == false, "SENDER_ALREADY_MEMBER");

        members[msg.sender].isVoter = true;
        members[msg.sender].joinedAt = block.timestamp;
        memberCount += 1;
        emit MemberAdded(msg.sender);
    }

    /// @notice calculate proposal id
    /// @dev we made this available to members so it's easy to get without sifting through tons of events if people want to see them
    function getProposalId(
        address[] memory _targets,
        uint256[] memory _values,
        bytes[] memory _calldatas,
        string memory _description
    ) public pure returns (uint256) {
        /// @dev we don't want a super long description to eat a ton of gas. 250 characters should be sufficient for our use case.
        require(
            bytes(_description).length <= 250,
            "DESCRIPTION_MORE_THAN_250_CHARS"
        );
        return
            uint256(
                keccak256(
                    abi.encode(_targets, _values, _calldatas, _description)
                )
            );
    }

    /// @notice calc proposal status depending on various factors
    /// @dev also made this public so members and people outside know what the proposal statu is
    function getProposalStatus(uint256 _proposalId)
        public
        view
        returns (ProposalStatus)
    {
        /// @dev proposal does not exist
        if (proposals[_proposalId].createdAt == 0) {
            return ProposalStatus.NO_STATUS;

            /// @dev if proposal was executed
        } else if (
            proposals[_proposalId].executionStatus == ExecutionStatus.SUCCESS
        ) {
            return ProposalStatus.EXECUTION_SUCCESS;
        } else if (block.timestamp <= getProposalDeadline(_proposalId)) {
            /// @dev if in the 2 day Voting window
            return ProposalStatus.IN_PROGRESS;

            /// @dev after 2 day voting period, needs to pass 25% quorum + be simple majrority
        } else if (
            /// @dev 25% quorum (accounting for decimals)
            (proposals[_proposalId].totalVotesCast * 10 >=
                (proposals[_proposalId].memberSnapshot * 10) / 4) &&
            /// @dev simple majority (accounting for decimals)
            (proposals[_proposalId].yesVotesCast * 10 >
                (proposals[_proposalId].totalVotesCast * 10) / 2)
        ) {
            /// @dev after PASSED, if not executed within 30 days, will go to EXECUTION_SUNSET
            if (block.timestamp >= getProposalSunset(_proposalId)) {
                return ProposalStatus.EXECUTION_SUNSET;
            }

            return ProposalStatus.PASSED;
        } else {
            return ProposalStatus.REJECTED;
        }
    }

    function getProposalDeadline(uint256 _proposalId)
        internal
        view
        returns (uint256)
    {
        return proposals[_proposalId].createdAt + 2 days;
    }

    function getProposalSunset(uint256 _proposalId)
        internal
        view
        returns (uint256)
    {
        return proposals[_proposalId].createdAt + 30 days;
    }

    /**
 @notice params definitions below
  targets = contract address
  values = eth value
  calldatas = function and params to execute on function
  description = description of what this is doing
 */
    function propose(
        address[] memory _targets,
        uint256[] memory _values,
        bytes[] memory _calldatas,
        string memory _description
    ) public onlyMember returns (uint256) {
        require(memberCount >= 10, "10_MEMBERS_MIN");
        require(_targets.length > 0, "PROPOSAL_CANNOT_BE_EMPTY");
        require(
            _targets.length == _values.length,
            "PROPOSAL_INCORRECT_PARAMS_1"
        );
        require(
            _targets.length == _calldatas.length,
            "PROPOSAL_INCORRECT_PARAMS_2"
        );
        require(bytes(_description).length > 0, "DESCRIPTION_CANNOT_BE_EMPTY");

        uint256 proposalId = getProposalId(
            _targets,
            _values,
            _calldatas,
            _description
        );

        require(
            getProposalStatus(proposalId) == ProposalStatus.NO_STATUS,
            "PROPOSAL_EXISTS"
        );

        proposals[proposalId].createdAt = block.timestamp;
        proposals[proposalId].memberSnapshot = memberCount;

        emit ProposalCreated(proposalId, msg.sender);

        return proposalId;
    }

    function buyNft(address _nftContract, uint256 _nftId) external payable {
        require(msg.sender == address(this), "ONLY_CALLABLE_BY_CONTRACT");

        uint256 price = NftMarketplace(NFT_MARKETPLACE).getPrice(
            _nftContract,
            _nftId
        );

        /// @dev by getting price during execution, it will allow me to get current price which has to be the same or lower
        require(price <= msg.value, "PRICE_INCREASED");
        bool success = NftMarketplace(NFT_MARKETPLACE).buy{value: price}(
            _nftContract,
            _nftId
        );
        require(success, "NFT_PURCHASE_FAILED");
        emit NFTBought(_nftId, address(_nftContract));
    }

    function castVote(uint256 _proposalId, uint8 _vote) external onlyMember {
        _castVote(_proposalId, _vote, msg.sender);
    }

    function castVotesBySig(
        uint256[] memory _proposalIds,
        uint8[] memory _votes,
        uint8[] memory _vs,
        bytes32[] memory _rs,
        bytes32[] memory _ses
    ) external {
        require(_proposalIds.length > 0, "PROPOSAL_REQUIRED");
        require(_proposalIds.length == _votes.length, "CAST_VOTE_INCORRECT_1");
        require(_proposalIds.length == _vs.length, "CAST_VOTE_INCORRECT_2");
        require(_proposalIds.length == _rs.length, "CAST_VOTE_INCORRECT_3");
        require(_proposalIds.length == _ses.length, "CAST_VOTE_INCORRECT_4");

        for (uint256 i = 0; i < _proposalIds.length; i++) {
            castVoteBySig(_proposalIds[i], _votes[i], _vs[i], _rs[i], _ses[i]);
        }
    }

    function castVoteBySig(
        uint256 _proposalId,
        uint8 _vote,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }

        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(CONTRACT_NAME)),
                chainId,
                address(this)
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(VOTE_TYPEHASH, _proposalId, _vote)
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );

        address signatory = ecrecover(digest, _v, _r, _s);

        require(members[signatory].isVoter, "NOT_A_VALID_MEMBER");

        _castVote(_proposalId, _vote, signatory);
    }

    function _castVote(
        uint256 _proposalId,
        uint8 _vote,
        address _voter
    ) private {
        require(
            _vote == VOTE_STATUS_YES || _vote == VOTE_STATUS_NO,
            "INCORRECT_VOTE"
        );

        /// @dev can only vote for proposals in progress
        require(
            getProposalStatus(_proposalId) == ProposalStatus.IN_PROGRESS,
            "CANNOT_VOTE_FOR_PROPOSAL"
        );

        require(
            proposals[_proposalId].createdAt > members[_voter].joinedAt,
            "MEMBER_JOINED_AFTER_PROPSAL_CREATION"
        );

        require(votesTally[_proposalId][_voter] == 0, "ALREADY_VOTED");
        votesTally[_proposalId][_voter] = _vote;
        proposals[_proposalId].totalVotesCast += 1;
        if (_vote == VOTE_STATUS_YES) {
            proposals[_proposalId].yesVotesCast += 1;
        }
        emit VoteCasted(msg.sender, _proposalId, _vote);
    }

    function execute(
        address[] memory _targets,
        uint256[] memory _values,
        bytes[] memory _calldatas,
        string memory _description
    ) public onlyAdmin {
        uint256 proposalId = getProposalId(
            _targets,
            _values,
            _calldatas,
            _description
        );

        require(
            getProposalStatus(proposalId) == ProposalStatus.PASSED,
            "ONLY_PASSED_PROPOSALS"
        );

        /// @dev moving this here will prevent re-entrancy
        proposals[proposalId].executionStatus = ExecutionStatus.SUCCESS;

        string memory errorMessage = "GG_DAO_FAIL_WITHOUT_MESSAGE";
        for (uint256 i = 0; i < _targets.length; ++i) {
            (bool success, bytes memory returndata) = _targets[i].call{
                value: _values[i]
            }(_calldatas[i]);

            handleExecResult(success, returndata, errorMessage);
        }
        emit ProposalExecuted(proposalId, msg.sender);
    }

    function handleExecResult(
        bool _success,
        bytes memory _returndata,
        string memory _errMessage
    ) private pure returns (bytes memory) {
        if (_success) {
            return _returndata;
        } else {
            if (_returndata.length > 0) {
                assembly {
                    let returndata_size := mload(_returndata)
                    revert(add(32, _returndata), returndata_size)
                }
            } else {
                revert(_errMessage);
            }
        }
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
