# DAO Governance (Solidity Smart Contract w/ Hardhat)

- this is my personal implementation of a DAO Governance contract that aims to collect rare NFTs, has a proposal system that can call arbitrary functions, and has cast by signature voting system.

## Main Commands (to see tests)

- `npm i`
- `npx hardhat compile`
- `npx hardhat test`

## Overview

The task of the `GGDao.sol` DAO contract can be summarized in 3 main functionalities

- 1. Implement a treasury contract that buys NFTs (I used an interface `NFTMarketplace.sol` as the interfacing marketplace contract)
- 2. Implement a voting system with signature votes
- 3. Implement a proposal system that calls arbitrary functions.

### Specific Features:

- 4. Allows anyone to buy a membership for 1 ETH
  - (4a) each address can only buy one membership
- 5. Allows a member to propose an NFT to buy
- 6. Allows members to vote on proposals:
  - (6a) With a 25% quorum
- 7. If passed, have the contract purchase the NFT in a reasonably automated fashion.
- 8. You MUST document your voting system. Please put the documentation in your project's README.md. In this project you have some flexibility on how you implement voting. Because of this, you must document:
  - (8a) The design decisions you made when creating your voting system
  - (8b) The risks and tradeoffs of said system
  - (8c) You must TEST your voting system!
  - (8d) Voting results need to be public to be indisputable, otherwise there could be someone who comes along and says "This vote was rigged!"
- 9. Support arbitrary functions: Even though this DAO has one main purpose, write your proposal system to support calling arbitrary functions, then use this to implement the NFT-buying behavior.
- 10. A proposal can propose a single function call, or many function calls in series. (per discord)
- 11. Write a function that allows any address to tally a vote cast by a DAO member using offchain-generated signatures. Then, write a function to do this in bulk.
  - (per discord's Thomas comment) think of a signature vote as like, "a vote cast via signature". so think of the voter as someone who cannot interact with the chain at all but has the voting power. someone who would just construct a signature that another EOA could submit
  - also this is a good explaination by (melville) https://discord.com/channels/870313767873962014/984911938381299733/985982144797110293
- 12. Use this interface for buying NFTs:

```
interface NftMarketplace {
    function getPrice(address nftContract, uint nftId) external returns (uint price);
    function buy(address nftContract, uint nftId) external payable returns (bool success);
}
```

## Voting DOCUMENTATION

- I implemented a simple vote with 25% with a simple majority of quorum needed to be reached. meaning at least 25% of members vote and at least half of them vote "YES"
  - there are a few minor downsides with this:
    - If a person doesn't want something to pass, they may not vote at all to try to prevent the proposal from not reaching the 25% quorum. We can live with that for the purposes of this project. If there is not enough interest to easily pass the 25% quorum, then from our perspective it's not a clear "YES" and therefore not of the highest priorities
- only members of DAO that joined before the proposal was created can vote. We track this by `joinedAt` `Member` property.
- Once a proposal is Created, members have 2 days to vote on it.
- After the voting period ends, the proposal either passes or fails (Voting is no longer allowed) based on the following:
  - `PASSED` if `> 25% quorum` && simple majority vote
  - `REJECTED` if one of 2 conditions above is not met
  - voting is prevented after deadline
- If proposal `PASSED`, it can be executed the master (deployer) or one of the admins that is added. However, there are instances, where the other contract's code doesn't work properly and we keep getting errors or the opportunity has passed
  - If After 30 days from proposal creation, we don't get a `EXECUTION_SUCCESS` in `execute` method (specifically `proposals[_proposalId].executionStatus = ExecutionStatus.SUCCESS;`), then the proposal will move permanantely to `EXECUTION_SUNSET`
- the reason for `EXECUTION_SUNSET` is that we don't want many old proposals to be hanging out. It can expose us to old proposals that can be executed and likely would be prone to malicious activity
- there are 3 ways to cast vote:
  - `castVote` - on chain individual
  - `castVoteBySig` - off chain individual signature
  - `castVotesBySig` - off chain batch signatures
- if there are disputes over votes, we can always use events to see who voted and recount:
  - refer to this test in the suite for this: `after a vote successeeded, make sure you can go back to events and confirm via vote tally on who voted yes and no`
- proposal status is calculated by `getProposalStatus`
- voters are not allowed to vote twice or change their vote
- we are generating proposal id by hashing function, params, description and other information provided. If user wants to propose identical function calls in the future, they need to update the description to reflect this
- I tried to keep voting simple but the fact that it is non-transferable and people cannot have multiple votes is a trade off.
- also I added the ability to add other admins for the simple purpose of executing Proposals. I felt that leaving that fully automated to members is dangerous since barrier to entry is low (only `1 ETH`) so as the deployer, I would give Admin/Exec priveleages to trusted few but they still have to buy membership in order to vote and propose
- lastly if `proposal` has any malicious code, admins have 2 days after voting and 28 days before `EXECUTION_SUNSET` to examine the function and decide if it's safe to execute

#### Proposal & Exection Features

- if a Proposal is approved, then master or admin can execute the proposal
  - if execution is successful, Porposal is marked as such
  - if execution is failed, we don't do anything in case Admins want to wait until we get more funds and then execute the proposal.
- To create a proposal, use the following method:
  - `createProposal`
- To execute a proposal, use the following method:
  - `execute`
- If you want to propose or execute a NFT proposal, you can reference `buyNft` in your executions & propsals. You can reference the test `creating proposal and execute nftBuy with 1 eth` to see how this is done

#### Other things added

- 94-98% coverage. the last few are hard to test & I didn't have time
- `onERC721Received` added so we can accept NFTs

#### Updated Settings I use Personally

- this repo is configured with hardhat template with prettier, eslint, vscode config, tsconfig. These are mostly pre-defined by hardhat template and make it very easy to start working and deploy contracts
