## Resubmission Notes for Auditor 7.4.22

in this resubmission, I am focusing on fixing `H-1` and `L-1` vulnerability. `M-1` I didn't have time for. I added specific notes below so it's easier to review

### Fix for [H-1] Proposal can be executed multiple times via reentrancy through `execute()`

- Reference: https://github.com/0xMacro/student.andriy-kulak/blob/f249a1709ff8dcd2430e9f1c70e13e0df2f8f684/dao/staff-audit-dao.md?plain=1#L39
- I moved the update of execution status to the top of the `execute()` function, which should prevent re-entrancy. If the exection fails, the exection success status will be reverted
- This commit fixes this issue: https://github.com/0xMacro/student.andriy-kulak/pull/12/commits/5b849b284a2788d4a605546b6b8f3b20a5be86fc

### Fix for [L-1] - NFTProposal can't be executed if the price of NFT has gone down.

- Reference: https://github.com/0xMacro/student.andriy-kulak/blob/5b849b284a2788d4a605546b6b8f3b20a5be86fc/dao/staff-audit-dao.md?plain=1#L82
- in order to to fix this I have to refactor a bunch of code.
- I added `buyNft` method which can only be called by the contract to get price and buy nft
- Now, as a member you have to encode that method yourself and use the methods `propose` and `execute`
- `proposeNftPurchase` and `executeNftPurchase` had to be deprecated. while they are useful, because members don't have to encode methods in order to try to buy nfts, they prevented me from buying nft that has decreased in price and therefore I removed them.
- I also update the tests in `"NFT flow"` section to reflect updated functionality
- This commit fixes this issue: https://github.com/0xMacro/student.andriy-kulak/pull/12/commits/2b86b6a8c2a0e3910e26a7a1ac2bf59233abeffb

### Comment for [M-1] Members who joined in the same block of proposal creation can't vote

- I didn't have time to work on this vuln this weekend so it is still here but I will look more into it next week

## DAO Requirements

Implement a DAO that aims to collect rare NFTs & does the following:

- 1. Implement a treasury contract that buys NFTs
- 2. Implement a voting system with signature votes
- 3. Implement a proposal system that calls arbitrary functions.

#### Specifically:

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
- there are 2 ways to create proposal as member:
  - `createProposal`
  - `createNftProposal`- only need the nft contract address and nft id. Useses a lot of the functionality of `createProposal`
- there are 2 ways to execute proposal as member:
  - `execute`
  - `executeNftProposal`- only need the nft contract address and nft id. uses a lot of functionality from `execute` per spec requirements
- per requirements I implemented `createNftProposal` & `executeNftProposal` and it uses the existing functions of `createProposal` and `execute`

#### Other things added

- 94-98% coverage. the last few are hard to test & I didn't have time
- `onERC721Received` added so we can accept NFTs

## Design Exercise

- Per project specs there is no vote delegation; it's not possible for Alice to delegate her voting power to Bob, so that when Bob votes he does so with the voting power of both himself and Alice in a single transaction. This means for someone's vote to count, that person must sign and broadcast their own transaction every time. How would you design your contract to allow for non-transitive vote delegation?
- What are some problems with implementing transitive vote delegation on-chain? (Transitive means: If A delegates to B, and B delegates to C, then C gains voting power from both A and B, while B has no voting power).

---

I would store the delegate references in a mapping.

- for the person that is voting, we will check the delegate mapping, and properly keep count of this.
- my code will also have to reflect that one voteCast can have many votes. This will make re-tallying votes a little bit more confusing, because someone may say: Why does this person have 3 votes (per emitted event)? we will then make sure we emit good events for delegations so we can show that the 2 extra votes were delegated with sufficient proof
- I would also allow the person to rescind their delegated votes or move it to someone else.
- another option to consider is expiring delegation. although I think we can remind the user that their votes are delegated every 30 days and ask them if they want to get their votes back

Transitive voting makes the whole problem of transparency a lot more complex. If there is a vote dispute and we have the situation mentioned `If A delegates to B, and B delegates to C, then C`, then someone may say that A doesn't like C and didn't want their votes to go to that person. Also re-tallying the votes would be painful :-( to trace all of this back.

- also transative voting is gas intensive

---

### Notes for Self (Andriy)

additional things that I add for myself

1. .vscode settings
2. update eslint settings
3. `npm i --save @openzeppelin/contracts`
4. in solidity files, I can add `import "hardhat/console.sol";` and then use `console.log` like in javascript to test
5. add `nodemon` and autorun `nodemon -x 'npx hardhat test' -w contracts -w test -e js,ts,sol`
6. update hardhat.config.js to use sol version `0.8.9`
