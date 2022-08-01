import { expect } from "chai";
import { ethers, network } from "hardhat";
import { BigNumber, BigNumberish } from "ethers";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  GGDao,
  GGDao__factory,
  DummyNftMarketplace,
  DummyNftMarketplace__factory,
  DummyOther,
  DummyOther__factory,
} from "../typechain";

const errors = {
  DESCRIPTION_MORE_THAN_250_CHARS: "DESCRIPTION_MORE_THAN_250_CHARS",
  INCORRECT_VOTE: "INCORRECT_VOTE",
  NOT_A_VALID_MEMBER: "NOT_A_VALID_MEMBER",
  ONLY_FOR_MEMBERS: "ONLY_FOR_MEMBERS",
  CANNOT_VOTE_FOR_PROPOSAL: "CANNOT_VOTE_FOR_PROPOSAL",
  MEMBER_JOINED_AFTER_PROPSAL_CREATION: "MEMBER_JOINED_AFTER_PROPSAL_CREATION",
  ALREADY_VOTED: "ALREADY_VOTED",
  ONLY_ADMIN: "ONLY_ADMIN",
  PROPOSAL_EXISTS: "PROPOSAL_EXISTS",
  GG_DAO_FAIL_WITHOUT_MESSAGE: "GG_DAO_FAIL_WITHOUT_MESSAGE",
  ONLY_MASTER: "ONLY_MASTER",
  INSUFFICIENT_FUNDS_TO_PURCHASE: "INSUFFICIENT_FUNDS_TO_PURCHASE",
  CANNOT_ALTER_MASTER: "CANNOT_ALTER_MASTER",
  MUST_CONTRIBUTE_1_ETH: "MUST_CONTRIBUTE_1_ETH",
  SENDER_ALREADY_MEMBER: "SENDER_ALREADY_MEMBER",
  PROPOSAL_CANNOT_BE_EMPTY: "PROPOSAL_CANNOT_BE_EMPTY",
  PROPOSAL_INCORRECT_PARAMS_1: "PROPOSAL_INCORRECT_PARAMS_1",
  PROPOSAL_INCORRECT_PARAMS_2: "PROPOSAL_INCORRECT_PARAMS_2",
  DESCRIPTION_CANNOT_BE_EMPTY: "DESCRIPTION_CANNOT_BE_EMPTY",
  PROPOSAL_REQUIRED: "PROPOSAL_REQUIRED",
  CAST_VOTE_INCORRECT_1: "CAST_VOTE_INCORRECT_1",
  CAST_VOTE_INCORRECT_2: "CAST_VOTE_INCORRECT_2",
  CAST_VOTE_INCORRECT_3: "CAST_VOTE_INCORRECT_3",
  CAST_VOTE_INCORRECT_4: "CAST_VOTE_INCORRECT_4",
  CAST_VOTE_INCORRECT_5: "CAST_VOTE_INCORRECT_5",
  ONLY_PASSED_PROPOSALS: "ONLY_PASSED_PROPOSALS",
  PRICE_INCREASED: "PRICE_INCREASED",
  ONLY_CALLABLE_BY_CONTRACT: "ONLY_CALLABLE_BY_CONTRACT",
};

enum ProposalStatus {
  NO_STATUS,
  IN_PROGRESS,
  PASSED,
  REJECTED, // rejected during voting
  EXECUTION_SUCCESS, // proposal is executed by admins
  EXECUTION_SUNSET, // execution of proposal failed
}

const VOTE_STATUS_YES = 1;
const VOTE_STATUS_NO = 2;

const ONE_ETH: BigNumber = ethers.utils.parseEther("1");
const FOUR_ETH: BigNumber = ethers.utils.parseEther("4");
const FIVE_ETH: BigNumber = ethers.utils.parseEther("5");
const TWENTY_ETH: BigNumber = ethers.utils.parseEther("20");

const pEth = (value: number) => ethers.utils.parseEther(value.toString());

const dummyNft = {
  contAddress1: "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199",
  contAddress2: "0xdD2FD4581271e230360230F9337D5c0430Bf44C0",
  nftId1: 11,
  nftId2: 12,
  nftId3: 12222,
};

// Or, set the time to be a specific amount (in seconds past epoch time)
// Bump the timestamp by a specific amount of seconds

const SECONDS_IN_DAY: number = 60 * 60 * 24;
const timeTravel = async (seconds: number) => {
  await network.provider.send("evm_increaseTime", [seconds]);
  await network.provider.send("evm_mine");
};

describe("GGDao", function () {
  let deployer: SignerWithAddress;
  let mem1: SignerWithAddress;
  let mem2: SignerWithAddress;
  let mem3: SignerWithAddress;
  let mem4: SignerWithAddress;
  let mem5: SignerWithAddress;
  let mem6: SignerWithAddress;
  let mem7: SignerWithAddress;
  let mem8: SignerWithAddress;
  let mem9: SignerWithAddress;
  let mem10: SignerWithAddress;
  let mem11: SignerWithAddress;
  let mem12: SignerWithAddress;
  let mem13: SignerWithAddress;
  let mem14: SignerWithAddress;
  let mem15: SignerWithAddress;
  let mem16: SignerWithAddress;
  let mem17: SignerWithAddress;
  let mem18: SignerWithAddress;
  let mem19: SignerWithAddress;
  let mem20: SignerWithAddress;
  let nonMem1: SignerWithAddress;
  let jonAdmin1: SignerWithAddress;

  let dummyNftMartketplace: DummyNftMarketplace;
  let DummyNftMartketplaceFactory: DummyNftMarketplace__factory;
  let dummyOther: DummyOther;
  let DummyOtherFactory: DummyOther__factory;
  let GGDao: GGDao;
  let GGDaoFactory: GGDao__factory;
  let ggDaoAddress: string;

  this.beforeAll(async () => {
    // there is no state to mess up so one can be used by all tests
    DummyNftMartketplaceFactory = await ethers.getContractFactory(
      "DummyNftMarketplace"
    );
    dummyNftMartketplace =
      (await DummyNftMartketplaceFactory.deploy()) as DummyNftMarketplace;
    await dummyNftMartketplace.deployed();

    // dummy other

    DummyOtherFactory = await ethers.getContractFactory("DummyOther");
    dummyOther = (await DummyOtherFactory.deploy()) as DummyOther;
    await dummyNftMartketplace.deployed();
  });

  this.beforeEach(async () => {
    [
      deployer,
      mem1,
      mem2,
      mem3,
      mem4,
      mem5,
      mem6,
      mem7,
      mem8,
      mem9,
      mem10,
      mem11,
      mem12,
      mem13,
      mem14,
      mem15,
      mem16,
      mem17,
      mem18,
      mem19,
      mem20,
      nonMem1,
      jonAdmin1,
    ] = await ethers.getSigners();

    GGDaoFactory = await ethers.getContractFactory("GGDao");
    GGDao = (await GGDaoFactory.deploy(dummyNftMartketplace.address)) as GGDao;
    await GGDao.deployed();
    ggDaoAddress = GGDao.address;

    // add 10 members by default
    const tenPrimaryMembers = [
      mem1,
      mem2,
      mem3,
      mem4,
      mem5,
      mem6,
      mem7,
      mem8,
      mem9,
      mem10,
    ];

    for (let i = 0; i < tenPrimaryMembers.length; i++) {
      await GGDao.connect(tenPrimaryMembers[i]).becomeMember({
        value: ONE_ETH,
      });
    }
  });

  const encodeBasicNftBuy = (address?: string, id?: number) => {
    const ifaceNftMarketplace = new ethers.utils.Interface(
      DummyNftMarketplace__factory.abi
    );
    return ifaceNftMarketplace.encodeFunctionData("buy", [
      address || dummyNftMartketplace.address,
      id || 11,
    ]);
  };

  const encodeOherPassingFunc = (
    address?: string,
    func = "randomPassingFunc"
  ) => {
    const ifaceOther = new ethers.utils.Interface(DummyOther__factory.abi);
    return ifaceOther.encodeFunctionData(func, [address]);
  };

  const abstractPropWith2Passing = async () => {
    const prop1 = {
      addresses: [dummyOther.address, dummyOther.address],
      values: [ONE_ETH, ONE_ETH],
      calldatas: [
        encodeOherPassingFunc(mem1.address, "randomPassingFunc"),
        encodeOherPassingFunc(mem1.address, "randomPassingFunc2"),
      ],
      desc: "dummy description",
    };
    const proposalId = await GGDao.getProposalId(
      prop1.addresses,
      prop1.values,
      prop1.calldatas,
      prop1.desc
    );

    await GGDao.connect(mem1).propose(
      prop1.addresses,
      prop1.values,
      prop1.calldatas,
      prop1.desc
    );
    return proposalId;
  };

  const abstractExecWith2Passing = async (
    executorAddress?: SignerWithAddress
  ) => {
    const prop1 = {
      addresses: [dummyOther.address, dummyOther.address],
      values: [ONE_ETH, ONE_ETH],
      calldatas: [
        encodeOherPassingFunc(mem1.address, "randomPassingFunc"),
        encodeOherPassingFunc(mem1.address, "randomPassingFunc2"),
      ],
      desc: "dummy description",
    };
    const proposalId = await GGDao.getProposalId(
      prop1.addresses,
      prop1.values,
      prop1.calldatas,
      prop1.desc
    );

    await GGDao.connect(executorAddress || deployer).execute(
      prop1.addresses,
      prop1.values,
      prop1.calldatas,
      prop1.desc
    );
    return proposalId;
  };

  const abstractPropWith1Pass1Fail = async () => {
    const prop1 = {
      addresses: [dummyOther.address, dummyOther.address],
      values: [ONE_ETH, ONE_ETH],
      calldatas: [
        encodeOherPassingFunc(mem1.address, "randomPassingFunc"),
        encodeOherPassingFunc(mem1.address, "randomFailingFunc"), // This should trigger a FAIL HAHA
      ],
      desc: "dummy description",
    };
    const proposalId = await GGDao.getProposalId(
      prop1.addresses,
      prop1.values,
      prop1.calldatas,
      prop1.desc
    );

    await GGDao.connect(mem1).propose(
      prop1.addresses,
      prop1.values,
      prop1.calldatas,
      prop1.desc
    );
    return proposalId;
  };

  const abstractExecWith1Pass1Fail = async () => {
    const prop1 = {
      addresses: [dummyOther.address, dummyOther.address],
      values: [ONE_ETH, ONE_ETH],
      calldatas: [
        encodeOherPassingFunc(mem1.address, "randomPassingFunc"),
        encodeOherPassingFunc(mem1.address, "randomFailingFunc"), // This should trigger a FAIL HAHA
      ],
      desc: "dummy description",
    };
    const proposalId = await GGDao.getProposalId(
      prop1.addresses,
      prop1.values,
      prop1.calldatas,
      prop1.desc
    );

    await GGDao.connect(deployer).execute(
      prop1.addresses,
      prop1.values,
      prop1.calldatas,
      prop1.desc
    );
    return proposalId;
  };

  const abstractProp1 = async (propsingAddress?: SignerWithAddress) => {
    const prop1 = {
      addresses: [dummyNftMartketplace.address],
      values: [ONE_ETH],
      calldatas: [encodeBasicNftBuy()],
      desc: "dummy description",
    };
    const proposalId = await GGDao.getProposalId(
      prop1.addresses,
      prop1.values,
      prop1.calldatas,
      prop1.desc
    );

    await GGDao.connect(propsingAddress || mem1).propose(
      prop1.addresses,
      prop1.values,
      prop1.calldatas,
      prop1.desc
    );
    return proposalId;
  };

  const execProp1 = async (addressExecuting: SignerWithAddress) => {
    const prop1 = {
      addresses: [dummyNftMartketplace.address],
      values: [ONE_ETH],
      calldatas: [encodeBasicNftBuy()],
      desc: "dummy description",
    };
    const proposalId = await GGDao.getProposalId(
      prop1.addresses,
      prop1.values,
      prop1.calldatas,
      prop1.desc
    );

    await GGDao.connect(addressExecuting).execute(
      prop1.addresses,
      prop1.values,
      prop1.calldatas,
      prop1.desc
    );
    return proposalId;
  };

  const getMajorityYesVote = async (proposalId: BigNumber) => {
    await GGDao.connect(mem1).castVote(proposalId, VOTE_STATUS_YES);
    await GGDao.connect(mem2).castVote(proposalId, VOTE_STATUS_YES);
    await GGDao.connect(mem3).castVote(proposalId, VOTE_STATUS_YES);

    await GGDao.connect(mem4).castVote(proposalId, VOTE_STATUS_NO);
    await GGDao.connect(mem5).castVote(proposalId, VOTE_STATUS_NO);
  };

  const createOfflineSig = async (
    proposalId: BigNumber,
    vote: number,
    member: SignerWithAddress
  ) => {
    // vote => 1 = yes, 2 = no
    const CONTRACT_NAME = await GGDao.CONTRACT_NAME();
    const domain = {
      name: CONTRACT_NAME,
      chainId: 31337,
      verifyingContract: GGDao.address,
    };
    const types = {
      Vote: [
        { name: "_proposalId", type: "uint256" },
        { name: "_vote", type: "uint8" },
      ],
    };

    const mail = {
      _proposalId: proposalId,
      _vote: vote,
    };

    const signer = await ethers.getSigner(member.address);
    const signature = await signer._signTypedData(domain, types, mail);

    const splitSig = ethers.utils.splitSignature(signature);
    await GGDao.castVoteBySig(
      proposalId,
      vote,
      splitSig.v,
      splitSig.r,
      splitSig.s
    );
    return splitSig;
  };

  // we created 2 offline sigs with 2 different members
  const createManyOfflineSig = async (
    proposalId: BigNumber,
    vote: number,
    member?: SignerWithAddress
  ) => {
    // vote => 1 = yes, 2 = no
    const CONTRACT_NAME = await GGDao.CONTRACT_NAME();
    const domain = {
      name: CONTRACT_NAME,
      chainId: 31337,
      verifyingContract: GGDao.address,
    };
    const types = {
      Vote: [
        { name: "_proposalId", type: "uint256" },
        { name: "_vote", type: "uint8" },
      ],
    };

    const mail = {
      _proposalId: proposalId,
      _vote: vote,
    };

    const signer1 = await ethers.getSigner(mem1.address);
    const signature = await signer1._signTypedData(domain, types, mail);
    const splitSig1 = ethers.utils.splitSignature(signature);

    const signer2 = await ethers.getSigner(mem2.address);
    const signature2 = await signer2._signTypedData(domain, types, mail);
    const splitSig2 = ethers.utils.splitSignature(signature2);
    await GGDao.castVotesBySig(
      [proposalId, proposalId],
      [vote, vote],
      [splitSig1.v, splitSig2.v],
      [splitSig1.r, splitSig2.r],
      [splitSig1.s, splitSig2.s]
    );
  };

  const addMember = (member: SignerWithAddress) => {
    return GGDao.connect(member).becomeMember({
      value: ONE_ETH,
    });
  };

  const add6MoreMembers = async () => {
    // on top of the 10 in before each block
    const tenPrimaryMembers = [mem11, mem12, mem13, mem14, mem15, mem16];

    for (let i = 0; i < tenPrimaryMembers.length; i++) {
      await addMember(tenPrimaryMembers[i]);
    }
  };

  describe("ADDING PEOPLE TO DAO tests", () => {
    it("testing that members are added", async () => {
      // 2 members already added in before each (for convenience since we will be using them across tests)

      const aliceStatus = await GGDao.members(mem1.address);
      const bobStatus = await GGDao.members(mem2.address);

      expect(aliceStatus.isVoter).to.eq(true);
      expect(bobStatus.isVoter).to.eq(true);

      // 10 members were edded in before each
      expect(await GGDao.memberCount()).to.eq(10);
    });

    it("must send 4eth exactly or an error will be sent", async () => {
      await expect(
        GGDao.connect(nonMem1).becomeMember({ value: 0 })
      ).to.be.revertedWith(errors.MUST_CONTRIBUTE_1_ETH);
    });

    it("cannot be a member tweice", async () => {
      await expect(
        GGDao.connect(mem1).becomeMember({ value: ONE_ETH })
      ).to.be.revertedWith(errors.SENDER_ALREADY_MEMBER);
    });
  });

  // VOTING Tests
  describe("VOTER tests", () => {
    it("basic member vote works", async () => {
      const proposalId = await abstractProp1();

      await GGDao.connect(mem1).castVote(proposalId, VOTE_STATUS_YES);
      const voterTally = await GGDao.votesTally(proposalId, mem1.address);
      const proposal = await GGDao.proposals(proposalId);

      expect(voterTally).to.eq(VOTE_STATUS_YES);
      expect(proposal.yesVotesCast).to.eq(1);
      expect(proposal.totalVotesCast).to.eq(1);
    });

    it("basic member succes 3 YES votes + 2 NO", async () => {
      const proposalId = await abstractProp1();

      await GGDao.connect(mem1).castVote(proposalId, VOTE_STATUS_YES);
      await GGDao.connect(mem2).castVote(proposalId, VOTE_STATUS_YES);
      await GGDao.connect(mem3).castVote(proposalId, VOTE_STATUS_YES);

      await GGDao.connect(mem4).castVote(proposalId, VOTE_STATUS_NO);
      await GGDao.connect(mem5).castVote(proposalId, VOTE_STATUS_NO);
      const proposal = await GGDao.proposals(proposalId);

      expect(proposal.yesVotesCast).to.eq(3);
      expect(proposal.totalVotesCast).to.eq(5);
    });
    it("vote 1 YES by castVoteBySig", async () => {
      const proposalId = await abstractProp1();

      await createOfflineSig(proposalId, 1, mem1);

      const voterTally = await GGDao.votesTally(proposalId, mem1.address);
      const proposal = await GGDao.proposals(proposalId);

      expect(voterTally).to.eq(VOTE_STATUS_YES);
      expect(proposal.yesVotesCast).to.eq(1);
      expect(proposal.totalVotesCast).to.eq(1);
    });

    it("vote 3 YES & 2 NO by castVoteBySig", async () => {
      const proposalId = await abstractProp1();

      await createOfflineSig(proposalId, 1, mem1);
      await createOfflineSig(proposalId, 1, mem2);
      await createOfflineSig(proposalId, 1, mem3);

      await createOfflineSig(proposalId, 2, mem4);
      await createOfflineSig(proposalId, 2, mem5);

      const proposal = await GGDao.proposals(proposalId);

      expect(proposal.yesVotesCast).to.eq(3);
      expect(proposal.totalVotesCast).to.eq(5);
    });

    it("cannot vote with an invalid vote number with castVoteBySig", async () => {
      const proposalId = await abstractProp1();

      await expect(createOfflineSig(proposalId, 0, mem1)).to.be.revertedWith(
        errors.INCORRECT_VOTE
      );
    });

    it("vote 3 YES & 2 NO - past deadline. ProposalStatus=SUCCESS", async () => {
      const proposalId = await abstractProp1();

      await createOfflineSig(proposalId, 1, mem1);
      await createOfflineSig(proposalId, 1, mem2);
      await createOfflineSig(proposalId, 1, mem3);

      await createOfflineSig(proposalId, 2, mem4);
      await createOfflineSig(proposalId, 2, mem5);

      // 2 days later past proposal vote deadline
      await timeTravel(SECONDS_IN_DAY * 2 + 60);

      expect(await GGDao.getProposalStatus(proposalId)).to.eq(
        ProposalStatus.PASSED
      );
    });

    it("10 total. vote 2 YES & 3 NO - past deadline. ProposalStatus=REJECTED", async () => {
      const proposalId = await abstractProp1();

      await createOfflineSig(proposalId, 1, mem1);
      await createOfflineSig(proposalId, 1, mem2);

      await createOfflineSig(proposalId, 2, mem4);
      await createOfflineSig(proposalId, 2, mem5);
      await createOfflineSig(proposalId, 2, mem6);

      // 2 days later past proposal vote deadline
      await timeTravel(SECONDS_IN_DAY * 2 + 60);

      expect(await GGDao.getProposalStatus(proposalId)).to.eq(
        ProposalStatus.REJECTED
      );
    });

    it("16 total, vote 2 YES & 2 NO - past deadline. ProposalStatus=REJECTED", async () => {
      // it's a tie with 25% quorum exactly so status should be rejected
      await add6MoreMembers();
      const proposalId = await abstractProp1();

      await createOfflineSig(proposalId, 1, mem1);
      await createOfflineSig(proposalId, 1, mem2);

      await createOfflineSig(proposalId, 2, mem4);
      await createOfflineSig(proposalId, 2, mem5);

      // 2 days later past proposal vote deadline
      await timeTravel(SECONDS_IN_DAY * 2 + 60);

      expect(await GGDao.getProposalStatus(proposalId)).to.eq(
        ProposalStatus.REJECTED
      );
    });

    it("during proposal, ensure that people up until proposal can vote.", async () => {
      const proposalId = await abstractProp1();

      // 1 day later. should be able to vote
      await timeTravel(SECONDS_IN_DAY * 1 + 60);

      await createOfflineSig(proposalId, 1, mem1);

      const voterTally = await GGDao.votesTally(proposalId, mem1.address);
      const proposal = await GGDao.proposals(proposalId);

      expect(voterTally).to.eq(VOTE_STATUS_YES);
      expect(proposal.yesVotesCast).to.eq(1);
      expect(proposal.totalVotesCast).to.eq(1);
    });

    it("rejecting random non member person from offline sig", async () => {
      const proposalId = await abstractProp1();

      // 1 day later. should be able to vote
      await timeTravel(SECONDS_IN_DAY * 1 + 60);

      await expect(createOfflineSig(proposalId, 1, nonMem1)).to.be.revertedWith(
        errors.NOT_A_VALID_MEMBER
      );
    });

    it("rejecting random non member person from casting vote directly", async () => {
      const proposalId = await abstractProp1();
      // 1 day later. should be able to vote
      await timeTravel(SECONDS_IN_DAY * 1 + 60);

      await expect(
        GGDao.connect(nonMem1).castVote(proposalId, VOTE_STATUS_YES)
      ).to.be.revertedWith(errors.ONLY_FOR_MEMBERS);
    });

    it("rejecting admin or master that is not a member", async () => {
      const proposalId = await abstractProp1();

      // 1 day later. should be able to vote
      await timeTravel(SECONDS_IN_DAY * 1 + 60);

      // offline sig
      await expect(
        createOfflineSig(proposalId, 1, deployer)
      ).to.be.revertedWith(errors.NOT_A_VALID_MEMBER);

      // regular way
      await expect(
        GGDao.connect(deployer).castVote(proposalId, VOTE_STATUS_YES)
      ).to.be.revertedWith(errors.ONLY_FOR_MEMBERS);
    });
    it("rejecting incorrect offline signature", async () => {
      const incorrectProposalId = ONE_ETH;
      await expect(
        createOfflineSig(incorrectProposalId, 1, mem1)
      ).to.be.revertedWith(errors.CANNOT_VOTE_FOR_PROPOSAL);
    });

    it("member tries to vote past deadline (both in castVote and Sig) and should fail", async () => {
      const proposalId = await abstractProp1();
      // 2 day later
      await timeTravel(SECONDS_IN_DAY * 2 + 60);

      await expect(
        GGDao.connect(mem1).castVote(proposalId, VOTE_STATUS_YES)
      ).to.be.revertedWith(errors.CANNOT_VOTE_FOR_PROPOSAL);

      await expect(
        GGDao.connect(mem2).castVote(proposalId, VOTE_STATUS_YES)
      ).to.be.revertedWith(errors.CANNOT_VOTE_FOR_PROPOSAL);
    });

    it("less than 25% quroum and voting expires. status should be rejected", async () => {
      // only 2 people out of 10 votes
      const proposalId = await abstractProp1();

      await GGDao.connect(mem1).castVote(proposalId, VOTE_STATUS_YES);
      await GGDao.connect(mem2).castVote(proposalId, VOTE_STATUS_NO);

      await timeTravel(SECONDS_IN_DAY * 2 + 60);

      expect(await GGDao.getProposalStatus(proposalId)).to.eq(
        ProposalStatus.REJECTED
      );
    });

    it("only members before the proposal was set can vote", async () => {
      const proposalId = await abstractProp1();

      await addMember(mem11);

      await expect(
        GGDao.connect(mem11).castVote(proposalId, VOTE_STATUS_NO)
      ).to.be.revertedWith(errors.MEMBER_JOINED_AFTER_PROPSAL_CREATION);
    });

    it("make sure the same member cannot vote twice", async () => {
      const proposalId = await abstractProp1();

      // member votes first time
      await GGDao.connect(mem1).castVote(proposalId, VOTE_STATUS_YES);

      // member tries to vote again
      await expect(
        GGDao.connect(mem1).castVote(proposalId, VOTE_STATUS_NO)
      ).to.be.revertedWith(errors.ALREADY_VOTED);
    });
    it("cannot vote for proposal that has been rejected", async () => {
      const proposalId = await abstractProp1();

      // 2 day later
      await timeTravel(SECONDS_IN_DAY * 2 + 60);

      await expect(
        GGDao.connect(mem1).castVote(proposalId, VOTE_STATUS_YES)
      ).to.be.revertedWith(errors.CANNOT_VOTE_FOR_PROPOSAL);
    });

    describe("castVotesBySig", async () => {
      it("castVotesBySig (multiple sigs) works correctly", async () => {
        const proposalId = await abstractProp1();

        // using the offline batch sig
        await createManyOfflineSig(proposalId, 1);

        const proposalStatus = await GGDao.proposals(proposalId);
        expect(proposalStatus.yesVotesCast).to.eq(2);
        const mem1Status = await GGDao.votesTally(proposalId, mem1.address);
        const mem2Status = await GGDao.votesTally(proposalId, mem2.address);
        expect(mem1Status).to.eq(1);
        expect(mem2Status).to.eq(1);
      });

      it("must have at least one proposal in array", async () => {
        await expect(
          GGDao.castVotesBySig([], [], [], [], [])
        ).to.be.revertedWith(errors.PROPOSAL_REQUIRED);
      });

      it("proposals and votes array must be same length", async () => {
        const proposalId = await abstractProp1();

        await expect(
          GGDao.castVotesBySig([proposalId], [], [], [], [])
        ).to.be.revertedWith(errors.CAST_VOTE_INCORRECT_1);
      });

      it("proposals and votes array must be same length", async () => {
        const proposalId = await abstractProp1();
        await expect(
          GGDao.castVotesBySig([proposalId, proposalId], [1, 1], [], [], [])
        ).to.be.revertedWith(errors.CAST_VOTE_INCORRECT_2);
      });

      it("proposals and v sig array must be same length", async () => {
        const proposalId = await abstractProp1();
        await expect(
          GGDao.castVotesBySig([proposalId, proposalId], [1, 1], [2, 2], [], [])
        ).to.be.revertedWith(errors.CAST_VOTE_INCORRECT_3);
      });
    });
  });

  // PROPOSAL
  describe("PROPOSAL test", async () => {
    it("able to add a basic proposal with a member", async () => {
      // proposal is less
      const proposalId = await abstractProp1();

      const resp = await GGDao.proposals(proposalId);

      expect(resp.memberSnapshot).to.eq(10);
      expect(await GGDao.getProposalStatus(proposalId)).to.eq(
        ProposalStatus.IN_PROGRESS
      );
      expect(resp.totalVotesCast).to.eq(0);
      expect(resp.yesVotesCast).to.eq(0);
    });
    it("test to make sure description with 249 characters works", async () => {
      const desc249 =
        "description... description... description... description... description... description... description... description... description... description... description... description... description... description... description... description... 249 chars";
      const prop1 = {
        addresses: [dummyNftMartketplace.address],
        values: [ONE_ETH],
        calldatas: [encodeBasicNftBuy()],
        desc: desc249,
      };
      await GGDao.connect(mem1).propose(
        prop1.addresses,
        prop1.values,
        prop1.calldatas,
        prop1.desc
      );

      const proposalId = await GGDao.getProposalId(
        prop1.addresses,
        prop1.values,
        prop1.calldatas,
        prop1.desc
      );

      const resp = await GGDao.proposals(proposalId);

      expect(resp.memberSnapshot).to.eq(10);
      expect(await GGDao.getProposalStatus(proposalId)).to.eq(
        ProposalStatus.IN_PROGRESS
      );
    });

    it("must have at least one target", async () => {
      const prop1 = {
        addresses: [dummyNftMartketplace.address],
        values: [ONE_ETH],
        calldatas: [encodeBasicNftBuy()],
        desc: "teetst",
      };
      await expect(
        GGDao.connect(mem1).propose(
          [],
          prop1.values,
          prop1.calldatas,
          prop1.desc
        )
      ).to.be.revertedWith(errors.PROPOSAL_CANNOT_BE_EMPTY);
    });

    it("target and values array must match in length", async () => {
      const prop1 = {
        addresses: [dummyNftMartketplace.address],
        values: [ONE_ETH],
        calldatas: [encodeBasicNftBuy()],
        desc: "teetst",
      };
      await expect(
        GGDao.connect(mem1).propose(
          prop1.addresses,
          [],
          prop1.calldatas,
          prop1.desc
        )
      ).to.be.revertedWith(errors.PROPOSAL_INCORRECT_PARAMS_1);
    });
    it("target and values array must match in length", async () => {
      const prop1 = {
        addresses: [dummyNftMartketplace.address],
        values: [ONE_ETH],
        calldatas: [encodeBasicNftBuy()],
        desc: "teetst",
      };
      await expect(
        GGDao.connect(mem1).propose(
          prop1.addresses,
          prop1.values,
          [],
          prop1.desc
        )
      ).to.be.revertedWith(errors.PROPOSAL_INCORRECT_PARAMS_2);
    });
    it("target and values array must match in length", async () => {
      const prop1 = {
        addresses: [dummyNftMartketplace.address],
        values: [ONE_ETH],
        calldatas: [encodeBasicNftBuy()],
        desc: "teetst",
      };
      await expect(
        GGDao.connect(mem1).propose(
          prop1.addresses,
          prop1.values,
          prop1.calldatas,
          ""
        )
      ).to.be.revertedWith(errors.DESCRIPTION_CANNOT_BE_EMPTY);
    });

    it("can only execute proposals that are in passed status", async () => {
      await expect(abstractExecWith2Passing()).to.be.revertedWith(
        errors.ONLY_PASSED_PROPOSALS
      );
    });

    it("proposal with description with 251 characters fails", async () => {
      const desc251 =
        "description... description... description... description... description... description... description... description... description... description... description... description... description... description... description... description..... 251 chars";
      const prop1 = {
        addresses: [dummyNftMartketplace.address],
        values: [ONE_ETH],
        calldatas: [encodeBasicNftBuy()],
        desc: desc251,
      };
      await expect(
        GGDao.connect(mem1).propose(
          prop1.addresses,
          prop1.values,
          prop1.calldatas,
          prop1.desc
        )
      ).to.be.revertedWith(errors.DESCRIPTION_MORE_THAN_250_CHARS);
    });

    describe("NFT flow", async () => {
      const encodeInternalNftBuy = (address?: string, id?: number) => {
        const ifaceNftMarketplace = new ethers.utils.Interface([
          "function buyNft(address _nftContract, uint256 _nftId)",
        ]);
        const nftContractAddress = address || dummyNft.contAddress1;
        const nftId = id || 11;
        return ifaceNftMarketplace.encodeFunctionData("buyNft", [
          nftContractAddress,
          nftId,
        ]); // address _nftContract, uint256 _nftId
      };

      const nftPropNew1 = async (props?: {
        nftAddress?: string;
        nftId?: number;
        value?: BigNumberish;
      }) => {
        const { nftAddress, nftId, value = ONE_ETH } = props || {};
        const nftProps1 = {
          addresses: [ggDaoAddress], // call our own GG dao contract
          values: [value],
          calldatas: [encodeInternalNftBuy(nftAddress, nftId)],
          desc: "dummy description",
        };

        const proposalId = await GGDao.getProposalId(
          nftProps1.addresses,
          nftProps1.values,
          nftProps1.calldatas,
          nftProps1.desc
        );

        await GGDao.connect(mem1).propose(
          nftProps1.addresses,
          nftProps1.values,
          nftProps1.calldatas,
          nftProps1.desc
        );

        return proposalId;
      };

      const nftExecuteNew1 = async (props?: {
        nftAddress?: string;
        nftId?: number;
        value?: BigNumberish;
      }) => {
        const { nftAddress, nftId, value = ONE_ETH } = props || {};
        const nftProps1 = {
          addresses: [ggDaoAddress], // call our own GG dao contract
          values: [value],
          calldatas: [encodeInternalNftBuy(nftAddress, nftId)],
          desc: "dummy description",
        };

        const proposalId = await GGDao.getProposalId(
          nftProps1.addresses,
          nftProps1.values,
          nftProps1.calldatas,
          nftProps1.desc
        );

        await GGDao.execute(
          nftProps1.addresses,
          nftProps1.values,
          nftProps1.calldatas,
          nftProps1.desc
        );

        return proposalId;
      };

      it("creating proposal and execute `nftBuy` with 1 eth", async () => {
        const proposalId1 = await nftPropNew1();

        expect(await GGDao.getProposalStatus(proposalId1)).to.eq(
          ProposalStatus.IN_PROGRESS
        );

        // proposal gets voted on and approved
        await GGDao.connect(mem1).castVote(proposalId1, VOTE_STATUS_YES);
        await GGDao.connect(mem2).castVote(proposalId1, VOTE_STATUS_YES);
        await GGDao.connect(mem3).castVote(proposalId1, VOTE_STATUS_YES);

        await GGDao.connect(mem4).castVote(proposalId1, VOTE_STATUS_NO);
        await GGDao.connect(mem5).castVote(proposalId1, VOTE_STATUS_NO);

        // 2 day later
        await timeTravel(SECONDS_IN_DAY * 2 + 60);

        console.log(
          "ggg10 proposal Status",
          await GGDao.getProposalStatus(proposalId1)
        );
        await nftExecuteNew1();

        // execution success
        expect(await GGDao.getProposalStatus(proposalId1)).to.eq(
          ProposalStatus.EXECUTION_SUCCESS
        );
      });

      it("creating proposal and execute `nftBuy` with 1 eth", async () => {
        const proposalId1 = await nftPropNew1();

        expect(await GGDao.getProposalStatus(proposalId1)).to.eq(
          ProposalStatus.IN_PROGRESS
        );

        // proposal gets voted on and approved
        await GGDao.connect(mem1).castVote(proposalId1, VOTE_STATUS_YES);
        await GGDao.connect(mem2).castVote(proposalId1, VOTE_STATUS_YES);
        await GGDao.connect(mem3).castVote(proposalId1, VOTE_STATUS_YES);

        await GGDao.connect(mem4).castVote(proposalId1, VOTE_STATUS_NO);
        await GGDao.connect(mem5).castVote(proposalId1, VOTE_STATUS_NO);

        // 2 day later
        await timeTravel(SECONDS_IN_DAY * 2 + 60);

        console.log(
          "ggg10 proposal Status",
          await GGDao.getProposalStatus(proposalId1)
        );
        await nftExecuteNew1();

        // execution success
        expect(await GGDao.getProposalStatus(proposalId1)).to.eq(
          ProposalStatus.EXECUTION_SUCCESS
        );
      });

      it("creating proposal and execute `nftBuy` with .5 eth and it should fail", async () => {
        const proposalId1 = await nftPropNew1({ value: pEth(0.5) });

        expect(await GGDao.getProposalStatus(proposalId1)).to.eq(
          ProposalStatus.IN_PROGRESS
        );

        // proposal gets voted on and approved
        await GGDao.connect(mem1).castVote(proposalId1, VOTE_STATUS_YES);
        await GGDao.connect(mem2).castVote(proposalId1, VOTE_STATUS_YES);
        await GGDao.connect(mem3).castVote(proposalId1, VOTE_STATUS_YES);

        await GGDao.connect(mem4).castVote(proposalId1, VOTE_STATUS_NO);
        await GGDao.connect(mem5).castVote(proposalId1, VOTE_STATUS_NO);

        // 2 day later
        await timeTravel(SECONDS_IN_DAY * 2 + 60);

        await expect(nftExecuteNew1({ value: pEth(0.5) })).to.be.revertedWith(
          errors.PRICE_INCREASED
        );

        // execution failed because it actually takes 1 eth to purchase the nft so proposal status is still not executed
        expect(await GGDao.getProposalStatus(proposalId1)).to.eq(
          ProposalStatus.PASSED
        );
      });

      it("random member tries to buy nft - should fail", async () => {
        await expect(
          GGDao.connect(mem1).buyNft(dummyNft.contAddress1, dummyNft.nftId1)
        ).to.be.revertedWith(errors.ONLY_CALLABLE_BY_CONTRACT);
      });
    });

    describe("Dyanmic func", () => {
      it("creating proposal with dynamic func", async () => {
        const proposalId = await abstractProp1();
        expect(await GGDao.getProposalStatus(proposalId)).to.eq(
          ProposalStatus.IN_PROGRESS
        );

        // proposal gets voted on and approved
        await getMajorityYesVote(proposalId);

        // 2 day later
        await timeTravel(SECONDS_IN_DAY * 2 + 60);

        expect(await GGDao.getProposalStatus(proposalId)).to.eq(
          ProposalStatus.PASSED
        );

        await execProp1(deployer);

        expect(await GGDao.getProposalStatus(proposalId)).to.eq(
          ProposalStatus.EXECUTION_SUCCESS
        );
      });
      it("when proposal gets accepted, only admin can execute. otherwise fail", async () => {
        const proposalId = await abstractProp1();
        expect(await GGDao.getProposalStatus(proposalId)).to.eq(
          ProposalStatus.IN_PROGRESS
        );

        // proposal gets voted on and approved
        await getMajorityYesVote(proposalId);

        // 2 day later
        await timeTravel(SECONDS_IN_DAY * 2 + 60);
        expect(await GGDao.getProposalStatus(proposalId)).to.eq(
          ProposalStatus.PASSED
        );

        await expect(execProp1(mem10)).to.be.revertedWith(errors.ONLY_ADMIN);
      });
      it("creating a proposal with 2 dynamic functions - both succeed after successful vote", async () => {
        const proposalId = await abstractPropWith2Passing();

        // proposal gets voted on and approved
        await getMajorityYesVote(proposalId);

        // 2 day later
        await timeTravel(SECONDS_IN_DAY * 2 + 60);

        expect(await GGDao.getProposalStatus(proposalId)).to.eq(
          ProposalStatus.PASSED
        );

        await abstractExecWith2Passing();

        expect(await GGDao.getProposalStatus(proposalId)).to.eq(
          ProposalStatus.EXECUTION_SUCCESS
        );
      });
      it("cannot propose an identical proposal with same description", async () => {
        // first one is OK to propose
        await abstractPropWith2Passing();

        // cannot prpose the same thing
        await expect(abstractPropWith2Passing()).to.be.revertedWith(
          errors.PROPOSAL_EXISTS
        );
      });
      it("creating a proposal with 2 dynamic functions - second fails. everything is reverted & proposal execution should fail", async () => {
        const proposalId = await abstractPropWith1Pass1Fail();

        // proposal gets voted on and approved
        await getMajorityYesVote(proposalId);

        // 2 day later
        await timeTravel(SECONDS_IN_DAY * 2 + 60);

        expect(await GGDao.getProposalStatus(proposalId)).to.eq(
          ProposalStatus.PASSED
        );

        await expect(abstractExecWith1Pass1Fail()).to.be.revertedWith(
          errors.GG_DAO_FAIL_WITHOUT_MESSAGE
        );
      });

      it("creating a proposal with 2 dynamic functions. vote passes but 31 days passes. status now = EXECUTION_SUNSET ", async () => {
        const proposalId = await abstractPropWith1Pass1Fail();

        // proposal gets voted on and approved
        await getMajorityYesVote(proposalId);

        // 31 day later
        await timeTravel(SECONDS_IN_DAY * 31 + 60);

        expect(await GGDao.getProposalStatus(proposalId)).to.eq(
          ProposalStatus.EXECUTION_SUNSET
        );
      });
    });
  });

  describe("ADMIN && Authorization tests test", async () => {
    it("can add admin", async () => {
      await GGDao.addAdmin(jonAdmin1.address);
      const jonStatus = await GGDao.admins(jonAdmin1.address);
      expect(jonStatus.isExec).to.eq(true);
    });

    it("can remove admind", async () => {
      await GGDao.removeAdmin(jonAdmin1.address);
      const jonStatus = await GGDao.admins(jonAdmin1.address);
      expect(jonStatus.isExec).to.eq(false);
    });

    it("only master can add admin", async () => {
      await expect(
        GGDao.connect(jonAdmin1).addAdmin(jonAdmin1.address)
      ).to.be.revertedWith(errors.ONLY_MASTER);
    });

    it("admin cannot remove admin", async () => {
      await expect(
        GGDao.connect(jonAdmin1).removeAdmin(deployer.address)
      ).to.be.revertedWith(errors.ONLY_MASTER);
    });

    it("master cannot remove themselves", async () => {
      await expect(
        GGDao.connect(deployer).removeAdmin(deployer.address)
      ).to.be.revertedWith(errors.CANNOT_ALTER_MASTER);
    });

    it("admin can execute a dynamic proposal and it will pass", async () => {
      await GGDao.addAdmin(jonAdmin1.address);
      const proposalId = await abstractPropWith2Passing();

      // proposal gets voted on and approved
      await getMajorityYesVote(proposalId);

      // 2 day later
      await timeTravel(SECONDS_IN_DAY * 2 + 60);

      expect(await GGDao.getProposalStatus(proposalId)).to.eq(
        ProposalStatus.PASSED
      );

      await abstractExecWith2Passing(jonAdmin1);

      expect(await GGDao.getProposalStatus(proposalId)).to.eq(
        ProposalStatus.EXECUTION_SUCCESS
      );
    });
    it("make sure removed admins cannot execute proposals", async () => {
      await GGDao.addAdmin(jonAdmin1.address);
      const proposalId = await abstractPropWith2Passing();

      // proposal gets voted on and approved
      await getMajorityYesVote(proposalId);

      // 2 day later
      await timeTravel(SECONDS_IN_DAY * 2 + 60);

      expect(await GGDao.getProposalStatus(proposalId)).to.eq(
        ProposalStatus.PASSED
      );

      // remove his rights
      await GGDao.removeAdmin(jonAdmin1.address);

      await expect(abstractExecWith2Passing(jonAdmin1)).to.be.revertedWith(
        errors.ONLY_ADMIN
      );
    });

    it("Admin or Master cannot propose if they are not members", async () => {
      await expect(abstractProp1(deployer)).to.be.revertedWith(
        errors.ONLY_FOR_MEMBERS
      );

      await GGDao.addAdmin(jonAdmin1.address);

      await expect(abstractProp1(jonAdmin1)).to.be.revertedWith(
        errors.ONLY_FOR_MEMBERS
      );
    });
  });

  // Emit All Important Events
  describe("Events Emitted test", async () => {
    // event ProposalExecuted(uint256 proposalId, address admin);
    it("ProposalCreated", async () => {
      const proposalId1 = await abstractProp1();
      const event = await GGDao.queryFilter(GGDao.filters.ProposalCreated());
      expect(event[0].args.proposalId).to.eq(proposalId1);
    });

    it("MemberAdded", async () => {
      // this should already emitted in before all block
      const event = await GGDao.queryFilter(GGDao.filters.MemberAdded());
      expect(event[0].args.member).to.eq(mem1.address);
    });
    it("ProposalExecuted", async () => {
      const proposalId = await abstractPropWith2Passing();

      // proposal gets voted on and approved
      await getMajorityYesVote(proposalId);

      // 2 day later
      await timeTravel(SECONDS_IN_DAY * 2 + 60);

      expect(await GGDao.getProposalStatus(proposalId)).to.eq(
        ProposalStatus.PASSED
      );

      await abstractExecWith2Passing();

      expect(await GGDao.getProposalStatus(proposalId)).to.eq(
        ProposalStatus.EXECUTION_SUCCESS
      );

      // ensuring event is called
      const event = await GGDao.queryFilter(GGDao.filters.ProposalExecuted());
      expect(event[0].args.proposalId).to.eq(proposalId);
    });

    it("after a vote successeeded, make sure you can go back to events and confirm via vote tally on who voted yes and no", async () => {
      const proposalId1 = await abstractProp1();
      expect(await GGDao.getProposalStatus(proposalId1)).to.eq(
        ProposalStatus.IN_PROGRESS
      );

      // 3 yes
      await GGDao.connect(mem1).castVote(proposalId1, VOTE_STATUS_YES);
      await GGDao.connect(mem2).castVote(proposalId1, VOTE_STATUS_YES);
      await GGDao.connect(mem3).castVote(proposalId1, VOTE_STATUS_YES);

      // 2 no
      await GGDao.connect(mem4).castVote(proposalId1, VOTE_STATUS_NO);
      await GGDao.connect(mem5).castVote(proposalId1, VOTE_STATUS_NO);

      const event = await GGDao.queryFilter(GGDao.filters.VoteCasted());

      // with these events we can confirm that votes were cast
      expect(event[0].args.vote).to.eq(1);
      expect(event[1].args.vote).to.eq(1);
      expect(event[2].args.vote).to.eq(1);

      expect(event[3].args.vote).to.eq(2);
      expect(event[4].args.vote).to.eq(2);
    });
  });
});
