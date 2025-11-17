// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Decentralized Lottery with Provable Fairness
 * @dev A transparent lottery system with automated prize distribution
 * @notice This is a simplified version - for production, integrate Chainlink VRF
 */
contract Lottery {
    address public owner;
    address[] public players;
    uint256 public lotteryId;
    uint256 public entryFee;
    
    mapping(uint256 => address) public lotteryHistory;
    
    event PlayerEntered(address indexed player, uint256 lotteryId);
    event WinnerPicked(address indexed winner, uint256 amount, uint256 lotteryId);
    event LotteryReset(uint256 newLotteryId);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier hasPlayers() {
        require(players.length > 0, "No players in the lottery");
        _;
    }
    
    constructor(uint256 _entryFee) {
        owner = msg.sender;
        lotteryId = 1;
        entryFee = _entryFee;
    }
    
    /**
     * @dev Allows a player to enter the lottery by paying the entry fee
     * @notice Players can enter multiple times by calling this function multiple times
     */
    function enterLottery() public payable {
        require(msg.value == entryFee, "Incorrect entry fee");
        
        players.push(msg.sender);
        
        emit PlayerEntered(msg.sender, lotteryId);
    }
    
    /**
     * @dev Generates a pseudo-random number and picks a winner
     * @notice For production, replace with Chainlink VRF for true randomness
     * @return winner address of the lottery winner
     */
    function pickWinner() public onlyOwner hasPlayers returns (address) {
        // Pseudo-random number generation (NOT secure for production)
        uint256 randomIndex = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    players.length
                )
            )
        ) % players.length;
        
        address winner = players[randomIndex];
        uint256 prizeAmount = address(this).balance;
        
        // Record winner in history
        lotteryHistory[lotteryId] = winner;
        
        // Transfer prize to winner
        (bool success, ) = winner.call{value: prizeAmount}("");
        require(success, "Transfer failed");
        
        emit WinnerPicked(winner, prizeAmount, lotteryId);
        
        // Reset lottery for next round
        _resetLottery();
        
        return winner;
    }
    
    /**
     * @dev Returns the current prize pool amount
     * @return balance current contract balance
     */
    function getPrizePool() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Returns all current players
     * @return array of player addresses
     */
    function getPlayers() public view returns (address[] memory) {
        return players;
    }
    
    /**
     * @dev Returns the winner of a specific lottery round
     * @param _lotteryId the lottery round number
     * @return address of the winner
     */
    function getWinner(uint256 _lotteryId) public view returns (address) {
        return lotteryHistory[_lotteryId];
    }
    
    /**
     * @dev Internal function to reset lottery state for next round
     */
    function _resetLottery() private {
        delete players;
        lotteryId++;
        
        emit LotteryReset(lotteryId);
    }
    
    /**
     * @dev Allows owner to update entry fee between rounds
     * @param _newFee the new entry fee in wei
     */
    function setEntryFee(uint256 _newFee) public onlyOwner {
        require(players.length == 0, "Cannot change fee during active lottery");
        entryFee = _newFee;
    }
}
