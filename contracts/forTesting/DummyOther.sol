//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "hardhat/console.sol";

contract DummyOther {
    function randomPassingFunc(address whitelist)
        external
        payable
        returns (bool success)
    {
        console.log("yyy3: We made it here", whitelist);
        return true;
    }

    function randomPassingFunc2(address whitelist)
        external
        payable
        returns (bool success)
    {
        console.log("yyy3: We made it here", whitelist);
        return true;
    }

    function randomFailingFunc(address whitelist) external {
        revert("FAIL HAHA");
    }
}
