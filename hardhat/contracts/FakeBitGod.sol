// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract FakeBitGod is ERC721, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    string private _uri;

    mapping(address => bool) private _used;

    modifier isUsed() {
        bool used = _used[msg.sender];
        require(!used, "Address already used");
        _;
    }

    constructor(string memory uri) ERC721("FakeBitGod", "NLIAKM") {
        _uri = uri;
    }

    function _baseURI() internal view override returns (string memory) {
        return _uri;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        tokenId;
        return _uri;
    }

    function setURI(string calldata uri) external onlyOwner {
        _uri = uri;
    }

    function safeMint(address to) public isUsed() {
        _used[msg.sender] = true;
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
    }
}