// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Token Staking Rewards Contract
 * @dev A staking contract that rewards users for locking tokens
 */
contract StakingRewards {
    
    // State variables
    address public owner;
    uint256 public totalStaked;
    uint256 public rewardRate; // Reward per second per token staked (in basis points)
    
    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lastClaimTime;
    }
    
    mapping(address => Stake) public stakes;
    
    // Events
    event Staked(address indexed user, uint256 amount, uint256 timestamp);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    event RewardClaimed(address indexed user, uint256 reward);
    event RewardRateUpdated(uint256 newRate);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    constructor(uint256 _rewardRate) {
        owner = msg.sender;
        rewardRate = _rewardRate;
    }
    
    /**
     * @dev Stake ETH to earn rewards
     */
    function stake() public payable {
        require(msg.value > 0, "Cannot stake 0");
        
        // If user already has stake, claim rewards first
        if (stakes[msg.sender].amount > 0) {
            _claimRewards();
        }
        
        stakes[msg.sender].amount += msg.value;
        stakes[msg.sender].startTime = block.timestamp;
        stakes[msg.sender].lastClaimTime = block.timestamp;
        
        totalStaked += msg.value;
        
        emit Staked(msg.sender, msg.value, block.timestamp);
    }
    
    /**
     * @dev Unstake tokens and claim all rewards
     */
    function unstake() public {
        require(stakes[msg.sender].amount > 0, "No stake found");
        
        uint256 stakedAmount = stakes[msg.sender].amount;
        uint256 reward = calculateReward(msg.sender);
        
        // Reset stake
        stakes[msg.sender].amount = 0;
        stakes[msg.sender].startTime = 0;
        stakes[msg.sender].lastClaimTime = 0;
        
        totalStaked -= stakedAmount;
        
        // Transfer staked amount + rewards
        uint256 totalAmount = stakedAmount + reward;
        (bool success, ) = msg.sender.call{value: totalAmount}("");
        require(success, "Transfer failed");
        
        emit Unstaked(msg.sender, stakedAmount, reward);
    }
    
    /**
     * @dev Claim accumulated rewards without unstaking
     */
    function claimRewards() public {
        require(stakes[msg.sender].amount > 0, "No stake found");
        _claimRewards();
    }
    
    /**
     * @dev Internal function to process reward claims
     */
    function _claimRewards() internal {
        uint256 reward = calculateReward(msg.sender);
        
        if (reward > 0) {
            stakes[msg.sender].lastClaimTime = block.timestamp;
            
            (bool success, ) = msg.sender.call{value: reward}("");
            require(success, "Reward transfer failed");
            
            emit RewardClaimed(msg.sender, reward);
        }
    }
    
    /**
     * @dev Calculate pending rewards for a user
     * @param user Address of the staker
     * @return reward amount in wei
     */
    function calculateReward(address user) public view returns (uint256) {
        if (stakes[user].amount == 0) {
            return 0;
        }
        
        uint256 stakingDuration = block.timestamp - stakes[user].lastClaimTime;
        uint256 reward = (stakes[user].amount * rewardRate * stakingDuration) / (10000 * 365 days);
        
        return reward;
    }
    
    /**
     * @dev Get staking information for a user
     * @param user Address to query
     * @return amount staked, start time, last claim time, pending rewards
     */
    function getStakeInfo(address user) public view returns (
        uint256 amount,
        uint256 startTime,
        uint256 lastClaimTime,
        uint256 pendingRewards
    ) {
        Stake memory userStake = stakes[user];
        return (
            userStake.amount,
            userStake.startTime,
            userStake.lastClaimTime,
            calculateReward(user)
        );
    }
    
    /**
     * @dev Update reward rate (owner only)
     * @param _newRate New reward rate in basis points
     */
    function setRewardRate(uint256 _newRate) public onlyOwner {
        rewardRate = _newRate;
        emit RewardRateUpdated(_newRate);
    }
    
    /**
     * @dev Fund the contract with rewards (owner only)
     */
    function fundRewards() public payable onlyOwner {
        require(msg.value > 0, "Must send ETH");
    }
    
    /**
     * @dev Get contract balance
     */
    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Emergency withdraw by owner (only if no active stakes)
     */
    function emergencyWithdraw() public onlyOwner {
        require(totalStaked == 0, "Active stakes exist");
        
        uint256 balance = address(this).balance;
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    // Receive function to accept ETH
    receive() external payable {}
}
