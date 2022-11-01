// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyERC721 is ERC721, Ownable {
    using Counters for Counters.Counter;
    using Strings for uint256;
    Counters.Counter private _tokenIds;
    mapping(uint256 => string) _tokenURIs;
    mapping(uint256 => address) id2add;

    constructor() ERC721("GameItem", "ITM") {}

    function _setTokenURI(uint256 tokenId, string memory _tokenURI) private {
        if (!_exists(tokenId)) {
            revert();
        }
        _tokenURIs[tokenId] = _tokenURI;
    }

    struct returnSouvenir {
        uint index;
        address Address;
        string souvenir;
    }

    function GetAllSouvenir() external view returns (returnSouvenir[] memory) {
        returnSouvenir[] memory result = new returnSouvenir[](
            _tokenIds.current()
        );
        for (uint i = 1; i <= _tokenIds.current(); i++) {
            result[i - 1].index = i;
            result[i - 1].Address = id2add[i];
            result[i - 1].souvenir = _tokenURIs[i];
        }
        return result;
    }

    function mint(address _to, string memory tokenURI_) external onlyOwner {
        _tokenIds.increment();
        uint256 _tokenId = _tokenIds.current();
        // 添加tokenId
        _mint(_to, _tokenId);
        // 存储tokenURI
        _setTokenURI(_tokenId, tokenURI_);
        // 设定主人
        id2add[_tokenId] = _to;
    }
}
