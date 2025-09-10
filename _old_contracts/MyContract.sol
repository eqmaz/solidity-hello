// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MyContract {

    string public name = "MyContract One";
    string public message = "hello world";
    uint public balance;

    struct Person {
        string name;
        uint age;
    }

    event MessageUpdated(
        string oldMessage,
        string newMessage
    );

    constructor() {
        balance = 0;
    }

    /**
     * Check the balance inside this smart contract
     */
    function getBalance() public view returns (uint) {
        return address(this).balance;
    }

    /**
     * Example of how to send ether from this address to a different address
     */
    function sendEther(address payable recipient, uint amount) public payable {
        // "require" is like an if statement that will throw an error if the condition is not met
        require(amount <= address(this).balance, "Insufficient balance in contract");
        recipient.transfer(amount);
    }

    /**
     * Example of event emitting
     */
    function updateMessageExample(string memory newMsg) public {
        string memory oldMsg = message;
        message = newMsg;

        // Logs are stored in the Ethereum log bloom filter and are queryable by external clients.
        emit MessageUpdated(oldMsg, newMsg); // writes a log entry to the transaction receipt.
    }

    /**
     * Examples of data types in Solidity
     */
    function dataTypesExample() public pure returns (uint, int, address, bool) {
        uint u = 1; // unsigned integer
        int i = -1; // signed integer
        address addr = 0x0000000000000000000000000000000000000000; // address
        bool b = true; // boolean
        // Note: Local mappings are not allowed in Solidity; mappings must be in storage.
        // This function returns basic types only.

        // Eth values
        uint value1 = 1 wei;      // smallest unit
        uint value2 = 1 gwei;     // 1e9 wei
        uint value3 = 1 ether;    // 1e18 wei
        uint value4 = 0.001 ether;   // 1e15 wei (finney is deprecated)
        uint value5 = 0.000001 ether;    // 1e12 wei (szabo deprecated)
        uint value6 = 1000000000; // 1e9 wei, same as 1 gwei

        return (u, i, addr, b);
    }

    function getName() public view returns (string memory) {
        return name;
    }

    /**
     * @notice Update the stored name.
     * @dev This changes contract state and will cost gas when executed on-chain.
     */
    function setName(string memory newName) public {
        name = newName;
    }

    function resetName() public {
        name = "MyContract One";
    }

    function add(uint a, uint b) public pure returns (uint) {
        return a + b;
    }

    function pay() public payable {
        balance = msg.value;

        // msg.sender = the address of the caller
        // msg.value  = the amount of ether sent with the call
        // msg.data   = the data sent with the call
        // msg.sig    = the function signature of the called function
        // tx.origin  = the address of the original caller (not recommended for use)
    }
}

