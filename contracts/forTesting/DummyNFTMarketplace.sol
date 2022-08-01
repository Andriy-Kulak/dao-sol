//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.9;

import "hardhat/console.sol";

contract DummyNftMarketplace {
    function getPrice(address _nftContract, uint256 _nftId)
        external
        returns (uint256 price)
    {
        address cont1 = 0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199; // hardhat address 9
        uint256 nftId1 = 11;
        uint256 nftId2 = 12;
        uint256 nftId3 = 12222;

        if (_nftContract == cont1 && _nftId == nftId1) {
            return 1 ether;
        }

        if (_nftContract == cont1 && _nftId == nftId2) {
            return 4 ether;
        }

        if (_nftContract == cont1 && _nftId == nftId3) {
            console.log("yyy2: We made it here", _nftContract, _nftId);
            return 100_000_000_000 ether;
        }
    }

    function buy(address _nftContract, uint256 _nftId)
        external
        payable
        returns (bool success)
    {
        console.log("yyy2: We made it here", _nftContract, _nftId);
        return true;
    }
}
