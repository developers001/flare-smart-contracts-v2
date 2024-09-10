// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../../../../contracts/protocol/implementation/Submission.sol";
import "../../../mock/PassContract.sol";

contract SubmissionTest is Test {
    Submission private submission;
    address private user1;
    address[] private users;

    bytes32[] private nameHashes;

    address[] private addresses;

    address[] private emptyAddresses;

    address private mockRelay;


    function setUp() public {
        submission = new Submission(
            IGovernanceSettings(makeAddr("contract")),
            makeAddr("governance"),
            makeAddr("updater"),
            false
        );
        user1 = makeAddr("user1");
        users.push(user1);

        nameHashes.push(keccak256("123"));
        addresses.push(makeAddr("randomAddresic"));

        mockRelay = makeAddr("relay");
    }

    function testInitNewVotingRoundNonFinalisation() public {
        vm.expectRevert("only flare system manager");

        submission.initNewVotingRound(users, users, users, users);
    }

    function testFuzzInitNewVotingRoundFinalisation(
        address[] calldata usersGen
    ) public {
        vm.assume(usersGen.length > 0);

        vm.prank(makeAddr("governance"));
        submission.setSubmit3MethodEnabled(false);

        vm.prank(address(submission.flareSystemsManager()));
        submission.initNewVotingRound(usersGen, usersGen, usersGen, usersGen);

        vm.prank(usersGen[0]);
        bool firstCallCom = submission.submit1();
        assertEq(firstCallCom, true, "1");
        vm.prank(usersGen[0]);
        bool secondCallCom = submission.submit1();
        assertEq(secondCallCom, false, "2");

        vm.prank(usersGen[0]);
        bool firstCallSub = submission.submit3();
        assertEq(firstCallSub, false, "4");
        vm.prank(usersGen[0]);
        bool secondCallSub = submission.submit3();
        assertEq(secondCallSub, false, "5");
    }

    function testInitNewVotingRoundFinalisationEmpty() public {
        vm.prank(address(submission.flareSystemsManager()));
        submission.initNewVotingRound(
            emptyAddresses,
            emptyAddresses,
            emptyAddresses,
            emptyAddresses
        );

        vm.prank(makeAddr("randomAddressic12391234891"));
        bool radnomCallCom = submission.submit1();
        assertEq(radnomCallCom, false, "3");

        vm.prank(makeAddr("randomAddress424"));
        bool radnomCallSub = submission.submit3();
        assertEq(radnomCallSub, false, "6");
    }

    function testGetUpdater() public {
        //  vm.expectRevert("only address updater");
        address updater = submission.getAddressUpdater();
        assertEq(updater, makeAddr("updater"));
    }

    function testUpdateContractAddressFail1() public {
        vm.expectRevert("only address updater");
        // vm.prank(makeAddr("updater"));
        submission.updateContractAddresses(nameHashes, addresses);
    }

    function testUpdateContractAddressFail2() public {
        vm.expectRevert("address zero");
        vm.prank(makeAddr("updater"));
        submission.updateContractAddresses(nameHashes, addresses);
    }

    function testUpdateContractAddress() public {
        nameHashes.push(keccak256(abi.encode("AddressUpdater")));
        addresses.push(makeAddr("AddressUpdater"));
        nameHashes.push(keccak256(abi.encode("FlareSystemsManager")));
        addresses.push(makeAddr("FlareSystemsManager"));
        nameHashes.push(keccak256(abi.encode("Relay")));
        addresses.push(makeAddr("Relay"));

        vm.startPrank(makeAddr("updater"));
        submission.updateContractAddresses(nameHashes, addresses);
        vm.stopPrank();

        assertEq(
            submission.flareSystemsManager(),
            makeAddr("FlareSystemsManager")
        );

        assertEq(
            address(submission.relay()),
            makeAddr("Relay")
        );
    }

    function testSetSubmitRev() public {
        vm.expectRevert("only governance");
        submission.setSubmit3MethodEnabled(true);

        vm.prank(address(submission.flareSystemsManager()));
    }

    function testSetSubmit() public {
        vm.prank(makeAddr("governance"));
        submission.setSubmit3MethodEnabled(true);
        assertEq(submission.submit3MethodEnabled(), true);
    }

    function testFuzzInitNewVotingRoundFinalisationAfterSubmitEn(
        address[] calldata usersGen
    ) public {
        vm.prank(makeAddr("governance"));
        submission.setSubmit3MethodEnabled(true);

        vm.assume(usersGen.length > 0);

        vm.prank(address(submission.flareSystemsManager()));
        submission.initNewVotingRound(usersGen, usersGen, usersGen, usersGen);

        vm.prank(usersGen[0]);
        bool firstCallRev = submission.submit2();
        assertEq(firstCallRev, true, "12");
        vm.prank(usersGen[0]);
        bool secondCallRev = submission.submit2();
        assertEq(secondCallRev, false, "22");

        vm.prank(usersGen[0]);
        bool firstCallSub = submission.submit3();
        assertEq(firstCallSub, true, "42");
        vm.prank(usersGen[0]);
        bool secondCallSub = submission.submit3();
        assertEq(secondCallSub, false, "52");

        vm.prank(usersGen[0]);
        bool firstCallSig = submission.submitSignatures();
        assertEq(firstCallSig, true, "72");
        vm.prank(usersGen[0]);
        bool secondCallSig = submission.submitSignatures();
        assertEq(secondCallSig, false, "73");
    }

    function testSubmitAndPass() public {
        PassContract passContract = new PassContract();
        vm.prank(makeAddr("governance"));
        bytes4 selector = PassContract.setData1.selector;
        submission.setSubmitAndPassData(address(passContract), selector);

        bytes memory data = abi.encode(makeAddr("test123"), 16);
        submission.submitAndPass(data);
        assertEq(passContract.account(), makeAddr("test123"));
        assertEq(passContract.value(), 16);
    }

    function testSubmitAndPassRevert() public {
        PassContract passContract = new PassContract();
        vm.prank(makeAddr("governance"));
        bytes4 selector = PassContract.setData2.selector;
        submission.setSubmitAndPassData(address(passContract), selector);

        bytes memory data = abi.encode(makeAddr("test123"), 16);
        vm.expectRevert("testError");
        submission.submitAndPass(data);
    }

    function testSubmitAndPassRevert2() public {
        address passContract = makeAddr("passContract");
        vm.prank(makeAddr("governance"));
        bytes4 selector = PassContract.setData1.selector;
        submission.setSubmitAndPassData(passContract, selector);

        bytes4 errorSelector = bytes4(keccak256("Error(string)"));
        bytes memory data = abi.encode(makeAddr("test123"), 16);
        vm.mockCallRevert(
            passContract,
            bytes.concat(selector, data),
            abi.encodeWithSelector(errorSelector, "error123"));
        vm.expectRevert("error123");
        submission.submitAndPass(data);
    }

    function testSubmitAndPassRevertDisabled() public {
        bytes memory data = abi.encode(makeAddr("test123"), 16);
        vm.expectRevert("submitAndPass disabled");
        submission.submitAndPass(data);
    }

    function testGetCurrentRandom() public {
        _setContractAddresses();
        vm.mockCall(
            mockRelay,
            abi.encodeWithSelector(RandomNumberV2Interface.getRandomNumber.selector),
            abi.encode(123, true, 5)
        );
        assertEq(submission.getCurrentRandom(), 123);

        (uint256 currentRandom, bool quality) = submission.getCurrentRandomWithQuality();
        assertEq(currentRandom, 123);
        assertEq(quality, true);

        uint256 randomTimestamp;
        (currentRandom, quality, randomTimestamp) =
            submission.getCurrentRandomWithQualityAndTimestamp();
        assertEq(currentRandom, 123);
        assertEq(quality, true);
        assertEq(randomTimestamp, 5);
    }

    function testGetCurrentRandom2() public {
        _setContractAddresses();
        vm.mockCall(
            mockRelay,
            abi.encodeWithSelector(RandomNumberV2Interface.getRandomNumber.selector),
            abi.encode(123, false, 5)
        );
        vm.expectRevert("Not secure");
        submission.getCurrentRandom();

        (uint256 currentRandom, bool quality) = submission.getCurrentRandomWithQuality();
        assertEq(currentRandom, 123);
        assertEq(quality, false);

        uint256 randomTimestamp;
        (currentRandom, quality, randomTimestamp) =
            submission.getCurrentRandomWithQualityAndTimestamp();
        assertEq(currentRandom, 123);
        assertEq(quality, false);
        assertEq(randomTimestamp, 5);
    }

    function _setContractAddresses() private {
        nameHashes.push(keccak256(abi.encode("AddressUpdater")));
        addresses.push(makeAddr("AddressUpdater"));
        nameHashes.push(keccak256(abi.encode("FlareSystemsManager")));
        addresses.push(makeAddr("FlareSystemsManager"));
        nameHashes.push(keccak256(abi.encode("Relay")));
        addresses.push(mockRelay);

        vm.prank(makeAddr("updater"));
        submission.updateContractAddresses(nameHashes, addresses);
    }
}
