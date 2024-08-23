
import { constants, expectEvent, expectRevert, time } from '@openzeppelin/test-helpers';
import { toChecksumAddress } from 'ethereumjs-util';
import { Contracts } from '../../deployment/scripts/Contracts';
import privateKeys from "../../deployment/test-1020-accounts.json";
import { RelayInitialConfig } from '../../deployment/utils/RelayInitialConfig';
import { ECDSASignatureWithIndex } from "../../scripts/libs/protocol/ECDSASignatureWithIndex";
import { FtsoConfigurations } from '../../scripts/libs/protocol/FtsoConfigurations';
import { IProtocolMessageMerkleRoot, ProtocolMessageMerkleRoot } from "../../scripts/libs/protocol/ProtocolMessageMerkleRoot";
import { RelayMessage } from '../../scripts/libs/protocol/RelayMessage';
import { ISigningPolicy, SigningPolicy } from "../../scripts/libs/protocol/SigningPolicy";
import { AddressBinderInstance, EntityManagerInstance, FtsoFeedIdConverterContract, FtsoFeedIdConverterInstance, FtsoFeedPublisherContract, FtsoFeedPublisherInstance, FtsoInflationConfigurationsInstance, GovernanceSettingsInstance, GovernanceVotePowerInstance, MockContractInstance, PChainStakeMirrorInstance, PChainStakeMirrorVerifierInstance, RewardManagerContract, WNatInstance } from '../../typechain-truffle';
import { MockContractContract } from '../../typechain-truffle/@gnosis.pm/mock-contract/contracts/MockContract.sol/MockContract';
import { FtsoFeedDecimalsContract, FtsoFeedDecimalsInstance } from '../../typechain-truffle/contracts/ftso/implementation/FtsoFeedDecimals';
import { FtsoInflationConfigurationsContract } from '../../typechain-truffle/contracts/ftso/implementation/FtsoInflationConfigurations';
import { FtsoRewardOffersManagerContract, FtsoRewardOffersManagerInstance } from '../../typechain-truffle/contracts/ftso/implementation/FtsoRewardOffersManager';
import { PollingFoundationContract, PollingFoundationInstance } from '../../typechain-truffle/contracts/governance/implementation/PollingFoundation';
import { PollingFtsoContract, PollingFtsoInstance } from '../../typechain-truffle/contracts/governance/implementation/PollingFtso';
import { CChainStakeContract, CChainStakeInstance } from '../../typechain-truffle/contracts/mock/CChainStake';
import { GovernanceVotePowerContract } from '../../typechain-truffle/contracts/mock/GovernanceVotePower';
import { PChainStakeMirrorContract } from '../../typechain-truffle/contracts/mock/PChainStakeMirror';
import { EntityManagerContract } from '../../typechain-truffle/contracts/protocol/implementation/EntityManager';
import { FlareSystemsCalculatorContract, FlareSystemsCalculatorInstance } from '../../typechain-truffle/contracts/protocol/implementation/FlareSystemsCalculator';
import { FlareSystemsManagerContract, FlareSystemsManagerInstance } from '../../typechain-truffle/contracts/protocol/implementation/FlareSystemsManager';
import { PChainStakeMirrorVerifierContract } from '../../typechain-truffle/contracts/protocol/implementation/PChainStakeMirrorVerifier';
import { RelayContract, RelayInstance } from '../../typechain-truffle/contracts/protocol/implementation/Relay';
import { RewardManagerInstance } from '../../typechain-truffle/contracts/protocol/implementation/RewardManager';
import { SubmissionContract, SubmissionInstance } from '../../typechain-truffle/contracts/protocol/implementation/Submission';
import { VoterRegistryContract, VoterRegistryInstance } from '../../typechain-truffle/contracts/protocol/implementation/VoterRegistry';
import { WNatDelegationFeeContract, WNatDelegationFeeInstance } from '../../typechain-truffle/contracts/protocol/implementation/WNatDelegationFee';
import { ValidatorRewardOffersManagerContract, ValidatorRewardOffersManagerInstance } from '../../typechain-truffle/contracts/staking/implementation/ValidatorRewardOffersManager';
import { AddressBinderContract } from '../../typechain-truffle/flattened/FlareSmartContracts.sol/AddressBinder';
import { CleanupBlockNumberManagerContract, CleanupBlockNumberManagerInstance } from '../../typechain-truffle/flattened/FlareSmartContracts.sol/CleanupBlockNumberManager';
import { VPContractContract } from '../../typechain-truffle/flattened/FlareSmartContracts.sol/VPContract';
import { WNatContract } from '../../typechain-truffle/flattened/FlareSmartContracts.sol/WNat';
import { generateSignatures } from '../unit/protocol/coding/coding-helpers';
import { getTestFile } from "../utils/constants";
import { executeTimelockedGovernanceCall, testDeployGovernanceSettings } from '../utils/contract-test-helpers';
import * as util from "../utils/key-to-address";
import { encodeContractNames, toBN } from '../utils/test-helpers';

const MockContract: MockContractContract = artifacts.require("MockContract");
const WNat: WNatContract = artifacts.require("WNat");
const VPContract: VPContractContract = artifacts.require("VPContract");
const PChainStakeMirror: PChainStakeMirrorContract = artifacts.require("PChainStakeMirror");
const GovernanceVotePower: GovernanceVotePowerContract = artifacts.require("GovernanceVotePower");
const AddressBinder: AddressBinderContract = artifacts.require("AddressBinder");
const PChainStakeMirrorVerifier: PChainStakeMirrorVerifierContract = artifacts.require("PChainStakeMirrorVerifier");
const EntityManager: EntityManagerContract = artifacts.require("EntityManager");
const VoterRegistry: VoterRegistryContract = artifacts.require("VoterRegistry");
const FlareSystemsCalculator: FlareSystemsCalculatorContract = artifacts.require("FlareSystemsCalculator");
const FlareSystemsManager: FlareSystemsManagerContract = artifacts.require("FlareSystemsManager");
const RewardManager: RewardManagerContract = artifacts.require("RewardManager");
const Submission: SubmissionContract = artifacts.require("Submission");
const Relay: RelayContract = artifacts.require("Relay");
const CChainStake: CChainStakeContract = artifacts.require("CChainStake");
const WNatDelegationFee: WNatDelegationFeeContract = artifacts.require("WNatDelegationFee");
const FtsoInflationConfigurations: FtsoInflationConfigurationsContract = artifacts.require("FtsoInflationConfigurations");
const FtsoRewardOffersManager: FtsoRewardOffersManagerContract = artifacts.require("FtsoRewardOffersManager");
const FtsoFeedDecimals: FtsoFeedDecimalsContract = artifacts.require("FtsoFeedDecimals");
const FtsoFeedPublisher: FtsoFeedPublisherContract = artifacts.require("FtsoFeedPublisher");
const FtsoFeedIdConverter: FtsoFeedIdConverterContract = artifacts.require("FtsoFeedIdConverter");
const CleanupBlockNumberManager: CleanupBlockNumberManagerContract = artifacts.require("CleanupBlockNumberManager");
const ValidatorRewardOffersManager: ValidatorRewardOffersManagerContract = artifacts.require("ValidatorRewardOffersManager");
const PollingFoundation: PollingFoundationContract = artifacts.require("PollingFoundation");
const PollingFtso: PollingFtsoContract = artifacts.require("PollingFtso");

type PChainStake = {
    txId: string,
    stakingType: number,
    inputAddress: string,
    nodeId: string,
    startTime: number,
    endTime: number,
    weight: number,
}

async function setMockStakingData(verifierMock: MockContractInstance, pChainStakeMirrorVerifierInterface: PChainStakeMirrorVerifierInstance, txId: string, stakingType: number, inputAddress: string, nodeId: string, startTime: BN, endTime: BN, weight: number, stakingProved: boolean = true): Promise<PChainStake> {
    let data = {
        txId: txId,
        stakingType: stakingType,
        inputAddress: inputAddress,
        nodeId: nodeId,
        startTime: startTime.toNumber(),
        endTime: endTime.toNumber(),
        weight: weight
    };

    const verifyPChainStakingMethod = pChainStakeMirrorVerifierInterface.contract.methods.verifyStake(data, []).encodeABI();
    await verifierMock.givenCalldataReturnBool(verifyPChainStakingMethod, stakingProved);
    return data;
}

function getSigningPolicyHash(signingPolicy: ISigningPolicy): string {
    return SigningPolicy.hash(signingPolicy);
}

contract(`End to end test; ${getTestFile(__filename)}`, async accounts => {

    const FTSO_PROTOCOL_ID = 100;
    const REWARD_MANAGER_ID = 0;

    let wNat: WNatInstance;
    let pChainStakeMirror: PChainStakeMirrorInstance;
    let governanceVotePower: GovernanceVotePowerInstance;
    let addressBinder: AddressBinderInstance;
    let pChainStakeMirrorVerifierInterface: PChainStakeMirrorVerifierInstance;
    let verifierMock: MockContractInstance;

    let governanceSettings: GovernanceSettingsInstance;
    let entityManager: EntityManagerInstance;
    let voterRegistry: VoterRegistryInstance;
    let flareSystemsCalculator: FlareSystemsCalculatorInstance;
    let flareSystemsManager: FlareSystemsManagerInstance;
    let rewardManager: RewardManagerInstance;
    let submission: SubmissionInstance;
    let relay: RelayInstance;
    let relay2: RelayInstance;
    let cChainStake: CChainStakeInstance;
    let wNatDelegationFee: WNatDelegationFeeInstance;
    let ftsoInflationConfigurations: FtsoInflationConfigurationsInstance;
    let ftsoRewardOffersManager: FtsoRewardOffersManagerInstance;
    let ftsoFeedDecimals: FtsoFeedDecimalsInstance;
    let ftsoFeedPublisher: FtsoFeedPublisherInstance;
    let ftsoFeedIdConverter: FtsoFeedIdConverterInstance;
    let validatorRewardOffersManager: ValidatorRewardOffersManagerInstance
    let cleanupBlockNumberManager: CleanupBlockNumberManagerInstance;
    let pollingFoundation: PollingFoundationInstance;
    let supplyMock: MockContractInstance;
    let pollingFtso: PollingFtsoInstance;

    let initialSigningPolicy: ISigningPolicy;
    let newSigningPolicy: ISigningPolicy;

    let registeredPAddresses: string[] = [];
    let registeredCAddresses: string[] = [];
    let now: BN;
    let nodeIds: string[] = [];
    let weightsGwei: number[] = [];
    let stakeIds: string[] = [];
    let rewardClaim: any;
    let feed: any;

    let tempSigningPolicyEncoded: string;

    const RANDOM_ROOT = web3.utils.keccak256("root");
    const RANDOM_ROOT2 = web3.utils.keccak256("root2");

    // same as in relay and Flare system manager contracts
    const REWARD_EPOCH_DURATION_IN_VOTING_EPOCHS = 3360; // 3.5 days
    const FIRST_REWARD_EPOCH_START_VOTING_ROUND_ID = 1000;
    const NEW_SIGNING_POLICY_INITIALIZATION_START_SEC = 3600 * 2; // 2 hours
    const RELAY_SELECTOR = web3.utils.sha3("relay()")!.slice(0, 10); // first 4 bytes is function selector

    const MESSAGE_FINALIZATION_WINDOW_IN_REWARD_EPOCHS = 100;
    const GWEI = 1e9;
    const VOTING_EPOCH_DURATION_SEC = 90;
    const REWARD_EPOCH_DURATION_IN_SEC = REWARD_EPOCH_DURATION_IN_VOTING_EPOCHS * VOTING_EPOCH_DURATION_SEC;

    const ADDRESS_UPDATER = accounts[15];
    const CLEANUP_BLOCK_NUMBER_MANAGER = accounts[16];
    const CLAIM_SETUP_MANAGER = accounts[17];
    const FTSO_REWARD_MANAGER = accounts[18];
    const INFLATION = accounts[19];

    const INITIAL_NUMBER_OF_VOTERS = 100;

    before(async () => {
        pChainStakeMirror = await PChainStakeMirror.new(
            accounts[0],
            accounts[0],
            ADDRESS_UPDATER,
            50
        );

        cChainStake = await CChainStake.new(accounts[0], accounts[0], ADDRESS_UPDATER, 0, 100, 1e10, 50);

        governanceSettings = await testDeployGovernanceSettings(accounts[0], 3600, [accounts[0]]);
        wNat = await WNat.new(accounts[0], "Wrapped NAT", "WNAT");
        await wNat.switchToProductionMode({ from: accounts[0] });
        let switchToProdModeTime = await time.latest();
        const vpContract = await VPContract.new(wNat.address, false);
        await wNat.setWriteVpContract(vpContract.address);
        await wNat.setReadVpContract(vpContract.address);
        governanceVotePower = await GovernanceVotePower.new(wNat.address, pChainStakeMirror.address, cChainStake.address);
        await wNat.setGovernanceVotePower(governanceVotePower.address);

        await time.increaseTo(switchToProdModeTime.addn(3600)); // 1 hour after switching to production mode
        await executeTimelockedGovernanceCall(wNat, (governance) =>
            wNat.setWriteVpContract(vpContract.address, { from: governance }));
        await executeTimelockedGovernanceCall(wNat, (governance) =>
            wNat.setReadVpContract(vpContract.address, { from: governance }));
        await executeTimelockedGovernanceCall(wNat, (governance) =>
            wNat.setGovernanceVotePower(governanceVotePower.address, { from: governance }));

        addressBinder = await AddressBinder.new();
        pChainStakeMirrorVerifierInterface = await PChainStakeMirrorVerifier.new(accounts[5], accounts[6], 10, 1000, 5, 5000);
        verifierMock = await MockContract.new();

        // set values
        weightsGwei = [1000, 500, 100, 50];
        nodeIds = ["0x0123456789012345678901234567890123456789", "0x0123456789012345678901234567890123456788", "0x0123456789012345678901234567890123456787", "0x0123456789012345678901234567890123456786"];
        stakeIds = [web3.utils.keccak256("stake1"), web3.utils.keccak256("stake2"), web3.utils.keccak256("stake3"), web3.utils.keccak256("stake4")];
        now = await time.latest();

        const initialThreshold = 65500 / 2;
        const initialVoters = accounts.slice(0, INITIAL_NUMBER_OF_VOTERS);
        const initialSigningPolicyVoters = accounts.slice(INITIAL_NUMBER_OF_VOTERS, INITIAL_NUMBER_OF_VOTERS + INITIAL_NUMBER_OF_VOTERS);
        const initialWeights = Array(100).fill(655);

        entityManager = await EntityManager.new(governanceSettings.address, accounts[0], 4);
        await entityManager.setNodePossessionVerifier(verifierMock.address); // mock verifier

        for (let i = 0; i < INITIAL_NUMBER_OF_VOTERS; i++) {
            await entityManager.proposeSigningPolicyAddress(accounts[INITIAL_NUMBER_OF_VOTERS + i], { from: initialVoters[i] });
            await entityManager.confirmSigningPolicyAddressRegistration(initialVoters[i], { from: accounts[INITIAL_NUMBER_OF_VOTERS + i] });
        }

        await time.advanceBlock();

        voterRegistry = await VoterRegistry.new(governanceSettings.address, accounts[0], ADDRESS_UPDATER, 100, 0, (await time.latestBlock()).toNumber() - 1, 0, initialVoters, initialWeights);
        flareSystemsCalculator = await FlareSystemsCalculator.new(governanceSettings.address, accounts[0], ADDRESS_UPDATER, 2500, 20 * 60, 600, 600);

        initialSigningPolicy = {
            rewardEpochId: 0,
            startVotingRoundId: FIRST_REWARD_EPOCH_START_VOTING_ROUND_ID,
            threshold: initialThreshold,
            seed: web3.utils.keccak256("123"),
            voters: initialSigningPolicyVoters,
            weights: initialWeights
        };

        const settings = {
            newSigningPolicyInitializationStartSeconds: NEW_SIGNING_POLICY_INITIALIZATION_START_SEC,
            randomAcquisitionMaxDurationSeconds: 8 * 3600,
            randomAcquisitionMaxDurationBlocks: 15000,
            newSigningPolicyMinNumberOfVotingRoundsDelay: 1,
            voterRegistrationMinDurationSeconds: 30 * 60,
            voterRegistrationMinDurationBlocks: 20, // default 900,
            submitUptimeVoteMinDurationSeconds: 10 * 60,
            submitUptimeVoteMinDurationBlocks: 20, // default 300,
            signingPolicyThresholdPPM: 500000,
            signingPolicyMinNumberOfVoters: 2,
            rewardExpiryOffsetSeconds: 90 * 24 * 3600
        };

        const initialSettings = {
            initialRandomVotePowerBlockSelectionSize: 1,
            initialRewardEpochId: 0,
            initialRewardEpochThreshold: initialThreshold
        }

        const firstVotingRoundStartTs = now.toNumber() - FIRST_REWARD_EPOCH_START_VOTING_ROUND_ID * VOTING_EPOCH_DURATION_SEC;

        flareSystemsManager = await FlareSystemsManager.new(
            governanceSettings.address,
            accounts[0],
            ADDRESS_UPDATER,
            accounts[0],
            settings,
            firstVotingRoundStartTs,
            VOTING_EPOCH_DURATION_SEC,
            FIRST_REWARD_EPOCH_START_VOTING_ROUND_ID,
            REWARD_EPOCH_DURATION_IN_VOTING_EPOCHS,
            initialSettings
        );

        rewardManager = await RewardManager.new(
            governanceSettings.address,
            accounts[0],
            ADDRESS_UPDATER,
            constants.ZERO_ADDRESS,
            REWARD_MANAGER_ID
        );

        const relayInitialConfig: RelayInitialConfig = {
            initialRewardEpochId: initialSigningPolicy.rewardEpochId,
            startingVotingRoundIdForInitialRewardEpochId: initialSigningPolicy.startVotingRoundId,
            initialSigningPolicyHash: getSigningPolicyHash(initialSigningPolicy),
            randomNumberProtocolId: FTSO_PROTOCOL_ID,
            firstVotingRoundStartTs: firstVotingRoundStartTs,
            votingEpochDurationSeconds: VOTING_EPOCH_DURATION_SEC,
            firstRewardEpochStartVotingRoundId: FIRST_REWARD_EPOCH_START_VOTING_ROUND_ID,
            rewardEpochDurationInVotingEpochs: REWARD_EPOCH_DURATION_IN_VOTING_EPOCHS,
            thresholdIncreaseBIPS: 12000,
            messageFinalizationWindowInRewardEpochs: MESSAGE_FINALIZATION_WINDOW_IN_REWARD_EPOCHS,
            feeCollectionAddress: constants.ZERO_ADDRESS,
            feeConfigs: []        
        }

        relay = await Relay.new(
            relayInitialConfig,
            flareSystemsManager.address
        );

        const relayInitialConfig2: RelayInitialConfig = {
            initialRewardEpochId: initialSigningPolicy.rewardEpochId,
            startingVotingRoundIdForInitialRewardEpochId: initialSigningPolicy.startVotingRoundId,
            initialSigningPolicyHash: getSigningPolicyHash(initialSigningPolicy),
            randomNumberProtocolId: FTSO_PROTOCOL_ID,
            firstVotingRoundStartTs: firstVotingRoundStartTs,
            votingEpochDurationSeconds: VOTING_EPOCH_DURATION_SEC,
            firstRewardEpochStartVotingRoundId: FIRST_REWARD_EPOCH_START_VOTING_ROUND_ID,
            rewardEpochDurationInVotingEpochs: REWARD_EPOCH_DURATION_IN_VOTING_EPOCHS,
            thresholdIncreaseBIPS: 12000,
            messageFinalizationWindowInRewardEpochs: MESSAGE_FINALIZATION_WINDOW_IN_REWARD_EPOCHS,
            feeCollectionAddress: constants.ZERO_ADDRESS,
            feeConfigs: []        
        }

        relay2 = await Relay.new(
            relayInitialConfig2,
            constants.ZERO_ADDRESS
        );

        submission = await Submission.new(governanceSettings.address, accounts[0], ADDRESS_UPDATER, false);

        wNatDelegationFee = await WNatDelegationFee.new(ADDRESS_UPDATER, 2, 2000);

        ftsoInflationConfigurations = await FtsoInflationConfigurations.new(governanceSettings.address, accounts[0]);

        ftsoRewardOffersManager = await FtsoRewardOffersManager.new(governanceSettings.address, accounts[0], ADDRESS_UPDATER, 100);

        ftsoFeedDecimals = await FtsoFeedDecimals.new(
            governanceSettings.address,
            accounts[0],
            ADDRESS_UPDATER,
            2,
            5,
            0,
            [
                { feedId: FtsoConfigurations.encodeFeedId({ category: 1, name: "BTC/USD" }), decimals: 2 },
                { feedId: FtsoConfigurations.encodeFeedId({ category: 1, name: "ETH/USD" }), decimals: 3 }
            ]);

        ftsoFeedPublisher = await FtsoFeedPublisher.new(
            governanceSettings.address,
            accounts[0],
            ADDRESS_UPDATER,
            FTSO_PROTOCOL_ID,
            200
        );

        ftsoFeedIdConverter = await FtsoFeedIdConverter.new();

        validatorRewardOffersManager = await ValidatorRewardOffersManager.new(governanceSettings.address, accounts[0], ADDRESS_UPDATER);

        cleanupBlockNumberManager = await CleanupBlockNumberManager.new(accounts[0], ADDRESS_UPDATER, "FlareSystemsManager");

        pollingFoundation = await PollingFoundation.new(governanceSettings.address, accounts[0], ADDRESS_UPDATER, [accounts[10], accounts[11]]);
        supplyMock = await MockContract.new();

        pollingFtso = await PollingFtso.new(governanceSettings.address, accounts[0], ADDRESS_UPDATER);

        await flareSystemsCalculator.enablePChainStakeMirror();
        await rewardManager.enablePChainStakeMirror();

        // update contract addresses
        await pChainStakeMirror.updateContractAddresses(
            encodeContractNames([Contracts.ADDRESS_UPDATER, Contracts.ADDRESS_BINDER, Contracts.GOVERNANCE_VOTE_POWER, Contracts.CLEANUP_BLOCK_NUMBER_MANAGER, Contracts.P_CHAIN_STAKE_MIRROR_VERIFIER]),
            [ADDRESS_UPDATER, addressBinder.address, governanceVotePower.address, CLEANUP_BLOCK_NUMBER_MANAGER, verifierMock.address], { from: ADDRESS_UPDATER });

        await cChainStake.updateContractAddresses(
            encodeContractNames([Contracts.ADDRESS_UPDATER, Contracts.GOVERNANCE_VOTE_POWER, Contracts.CLEANUP_BLOCK_NUMBER_MANAGER]),
            [ADDRESS_UPDATER, governanceVotePower.address, CLEANUP_BLOCK_NUMBER_MANAGER], { from: ADDRESS_UPDATER });

        await voterRegistry.updateContractAddresses(
            encodeContractNames([Contracts.ADDRESS_UPDATER, Contracts.FLARE_SYSTEMS_MANAGER, Contracts.ENTITY_MANAGER, Contracts.FLARE_SYSTEMS_CALCULATOR]),
            [ADDRESS_UPDATER, flareSystemsManager.address, entityManager.address, flareSystemsCalculator.address], { from: ADDRESS_UPDATER });

        await flareSystemsCalculator.updateContractAddresses(
            encodeContractNames([Contracts.ADDRESS_UPDATER, Contracts.FLARE_SYSTEMS_MANAGER, Contracts.ENTITY_MANAGER, Contracts.WNAT_DELEGATION_FEE, Contracts.VOTER_REGISTRY, Contracts.P_CHAIN_STAKE_MIRROR, Contracts.WNAT]),
            [ADDRESS_UPDATER, flareSystemsManager.address, entityManager.address, wNatDelegationFee.address, voterRegistry.address, pChainStakeMirror.address, wNat.address], { from: ADDRESS_UPDATER });

        await flareSystemsManager.updateContractAddresses(
            encodeContractNames([Contracts.ADDRESS_UPDATER, Contracts.VOTER_REGISTRY, Contracts.SUBMISSION, Contracts.RELAY, Contracts.REWARD_MANAGER, Contracts.CLEANUP_BLOCK_NUMBER_MANAGER]),
            [ADDRESS_UPDATER, voterRegistry.address, submission.address, relay.address, rewardManager.address, cleanupBlockNumberManager.address], { from: ADDRESS_UPDATER });

        await rewardManager.updateContractAddresses(
            encodeContractNames([Contracts.ADDRESS_UPDATER, Contracts.VOTER_REGISTRY, Contracts.CLAIM_SETUP_MANAGER, Contracts.FLARE_SYSTEMS_MANAGER, Contracts.FLARE_SYSTEMS_CALCULATOR, Contracts.P_CHAIN_STAKE_MIRROR, Contracts.WNAT, Contracts.FTSO_REWARD_MANAGER]),
            [ADDRESS_UPDATER, voterRegistry.address, CLAIM_SETUP_MANAGER, flareSystemsManager.address, flareSystemsCalculator.address, pChainStakeMirror.address, wNat.address, FTSO_REWARD_MANAGER], { from: ADDRESS_UPDATER });

        await submission.updateContractAddresses(
            encodeContractNames([Contracts.ADDRESS_UPDATER, Contracts.FLARE_SYSTEMS_MANAGER, Contracts.RELAY]),
            [ADDRESS_UPDATER, flareSystemsManager.address, relay.address], { from: ADDRESS_UPDATER });

        await wNatDelegationFee.updateContractAddresses(
            encodeContractNames([Contracts.ADDRESS_UPDATER, Contracts.FLARE_SYSTEMS_MANAGER]),
            [ADDRESS_UPDATER, flareSystemsManager.address], { from: ADDRESS_UPDATER });

        await ftsoRewardOffersManager.updateContractAddresses(
            encodeContractNames([Contracts.ADDRESS_UPDATER, Contracts.FLARE_SYSTEMS_MANAGER, Contracts.REWARD_MANAGER, Contracts.FTSO_INFLATION_CONFIGURATIONS, Contracts.FTSO_FEED_DECIMALS, Contracts.INFLATION]),
            [ADDRESS_UPDATER, flareSystemsManager.address, rewardManager.address, ftsoInflationConfigurations.address, ftsoFeedDecimals.address, INFLATION], { from: ADDRESS_UPDATER });

        await ftsoFeedDecimals.updateContractAddresses(
            encodeContractNames([Contracts.ADDRESS_UPDATER, Contracts.FLARE_SYSTEMS_MANAGER]),
            [ADDRESS_UPDATER, flareSystemsManager.address], { from: ADDRESS_UPDATER });

        await ftsoFeedPublisher.updateContractAddresses(
            encodeContractNames([Contracts.ADDRESS_UPDATER, Contracts.RELAY]),
            [ADDRESS_UPDATER, relay.address], { from: ADDRESS_UPDATER });

        await validatorRewardOffersManager.updateContractAddresses(
            encodeContractNames([Contracts.ADDRESS_UPDATER, Contracts.FLARE_SYSTEMS_MANAGER, Contracts.REWARD_MANAGER, Contracts.INFLATION]),
            [ADDRESS_UPDATER, flareSystemsManager.address, rewardManager.address, INFLATION], { from: ADDRESS_UPDATER });

        await cleanupBlockNumberManager.updateContractAddresses(
            encodeContractNames([Contracts.ADDRESS_UPDATER, Contracts.FLARE_SYSTEMS_MANAGER]),
            [ADDRESS_UPDATER, flareSystemsManager.address], { from: ADDRESS_UPDATER });

        await pollingFoundation.updateContractAddresses(
            encodeContractNames([Contracts.ADDRESS_UPDATER, Contracts.FLARE_SYSTEMS_MANAGER, Contracts.SUPPLY, Contracts.SUBMISSION, Contracts.GOVERNANCE_VOTE_POWER]),
            [ADDRESS_UPDATER, flareSystemsManager.address, supplyMock.address, submission.address, governanceVotePower.address], { from: ADDRESS_UPDATER });

        await pollingFtso.updateContractAddresses(
            encodeContractNames([Contracts.ADDRESS_UPDATER, Contracts.VOTER_REGISTRY, Contracts.FLARE_SYSTEMS_MANAGER]),
            [ADDRESS_UPDATER, voterRegistry.address, flareSystemsManager.address], { from: ADDRESS_UPDATER });

        // set reward offers manager list
        await rewardManager.setRewardOffersManagerList([ftsoRewardOffersManager.address, validatorRewardOffersManager.address]);

        // set initial reward data
        await rewardManager.setInitialRewardData();

        // send some inflation funds
        const inflationFunds = web3.utils.toWei("200000");
        await ftsoRewardOffersManager.setDailyAuthorizedInflation(inflationFunds, { from: INFLATION });
        await ftsoRewardOffersManager.receiveInflation({ value: inflationFunds, from: INFLATION });

        await validatorRewardOffersManager.setDailyAuthorizedInflation(inflationFunds, { from: INFLATION });
        await validatorRewardOffersManager.receiveInflation({ value: inflationFunds, from: INFLATION });

        // set reward epoch switchover trigger contracts
        await flareSystemsManager.setRewardEpochSwitchoverTriggerContracts([ftsoRewardOffersManager.address, validatorRewardOffersManager.address]);

        // set ftso configurations
        await ftsoInflationConfigurations.addFtsoConfiguration(
            {
                feedIds: FtsoConfigurations.encodeFeedIds([{ category: 1, name: "BTC/USD" }, { category: 1, name: "XRP/USD" }, { category: 1, name: "FLR/USD" }, { category: 1, name: "ETH/USD" }]),
                inflationShare: 200,
                minRewardedTurnoutBIPS: 5000,
                mode: 0,
                primaryBandRewardSharePPM: 700000,
                secondaryBandWidthPPMs: FtsoConfigurations.encodeSecondaryBandWidthPPMs([400, 800, 100, 250])
            }
        );
        await ftsoInflationConfigurations.addFtsoConfiguration(
            {
                feedIds: FtsoConfigurations.encodeFeedIds([{ category: 1, name: "BTC/USD" }, { category: 1, name: "LTC/USD" }]),
                inflationShare: 100,
                minRewardedTurnoutBIPS: 5000,
                mode: 0,
                primaryBandRewardSharePPM: 600000,
                secondaryBandWidthPPMs: FtsoConfigurations.encodeSecondaryBandWidthPPMs([200, 1000])
            }
        );

        // set polling ftso maintainer and parameters
        await pollingFtso.setMaintainer(accounts[10]);
        await pollingFtso.setParameters(3600, 3600, 5000, 5000, 100, { from: accounts[10] });

        // offer some rewards
        await ftsoRewardOffersManager.offerRewards(1, [
            {
                amount: 25000000,
                feedId: FtsoConfigurations.encodeFeedId({ category: 1, name: "BTC/USD" }),
                minRewardedTurnoutBIPS: 5000,
                primaryBandRewardSharePPM: 450000,
                secondaryBandWidthPPM: 50000,
                claimBackAddress: constants.ZERO_ADDRESS
            }],
            { value: "25000000" }
        );

        // enable claims
        await rewardManager.enableClaims();

        // activate contracts
        await pChainStakeMirror.activate();
        await cChainStake.activate();
        await rewardManager.activate();
    });

    it("Should register addresses", async () => {
        for (let i = 0; i < 4; i++) {
            let prvKey = privateKeys[i].privateKey.slice(2);
            let prvkeyBuffer = Buffer.from(prvKey, 'hex');
            let [x, y] = util.privateKeyToPublicKeyPair(prvkeyBuffer);
            let pubKey = "0x" + util.encodePublicKey(x, y, false).toString('hex');
            let pAddr = "0x" + util.publicKeyToAvalancheAddress(x, y).toString('hex');
            let cAddr = toChecksumAddress("0x" + util.publicKeyToEthereumAddress(x, y).toString('hex'));
            await addressBinder.registerAddresses(pubKey, pAddr, cAddr);
            registeredPAddresses.push(pAddr);
            registeredCAddresses.push(cAddr)
        }
    });

    it("Should verify stakes", async () => {
        for (let i = 0; i < 4; i++) {
            const data = await setMockStakingData(verifierMock, pChainStakeMirrorVerifierInterface, stakeIds[i], 0, registeredPAddresses[i], nodeIds[i], now.subn(10), now.addn(10000), weightsGwei[i]);
            await pChainStakeMirror.mirrorStake(data, []);
        }
    });

    it("Should register and confirm delegation addresses", async () => {
        for (let i = 0; i < 4; i++) {
            await entityManager.proposeDelegationAddress(accounts[50 + i], { from: registeredCAddresses[i] });
            await entityManager.confirmDelegationAddressRegistration(registeredCAddresses[i], { from: accounts[50 + i] });
        }
    });

    it("Should wrap some funds", async () => {
        for (let i = 0; i < 4; i++) {
            await wNat.deposit({ value: weightsGwei[i] * GWEI, from: accounts[50 + i] });
        }
    });

    it("Should register nodes", async () => {
        for (let i = 0; i < 4; i++) {
            await entityManager.registerNodeId(nodeIds[i], "0x", "0x", { from: registeredCAddresses[i] });
        }
    });

    it("Should register and confirm data provider addresses", async () => {
        for (let i = 0; i < 4; i++) {
            await entityManager.proposeSubmitAddress(accounts[10 + i], { from: registeredCAddresses[i] });
            await entityManager.confirmSubmitAddressRegistration(registeredCAddresses[i], { from: accounts[10 + i] });
        }
    });

    it("Should register and confirm deposit signatures addresses", async () => {
        for (let i = 0; i < 4; i++) {
            await entityManager.proposeSubmitSignaturesAddress(accounts[20 + i], { from: registeredCAddresses[i] });
            await entityManager.confirmSubmitSignaturesAddressRegistration(registeredCAddresses[i], { from: accounts[20 + i] });
        }
    });

    it("Should register and confirm signing policy addresses", async () => {
        for (let i = 0; i < 4; i++) {
            await entityManager.proposeSigningPolicyAddress(accounts[30 + i], { from: registeredCAddresses[i] });
            await entityManager.confirmSigningPolicyAddressRegistration(registeredCAddresses[i], { from: accounts[30 + i] });
        }
    });

    it("Should start random acquisition", async () => {
        await time.increaseTo(now.addn(REWARD_EPOCH_DURATION_IN_SEC - NEW_SIGNING_POLICY_INITIALIZATION_START_SEC)); // 2 hours before new reward epoch
        expectEvent(await flareSystemsManager.daemonize(), "RandomAcquisitionStarted", { rewardEpochId: toBN(1) });
    });

    it("Should get good random", async () => {
        const votingRoundId = FIRST_REWARD_EPOCH_START_VOTING_ROUND_ID + REWARD_EPOCH_DURATION_IN_VOTING_EPOCHS -
            NEW_SIGNING_POLICY_INITIALIZATION_START_SEC / VOTING_EPOCH_DURATION_SEC + 1;
        const quality = true;

        const messageData: IProtocolMessageMerkleRoot = { protocolId: FTSO_PROTOCOL_ID, votingRoundId: votingRoundId, isSecureRandom: quality, merkleRoot: RANDOM_ROOT };
        const messageHash = ProtocolMessageMerkleRoot.hash(messageData);
        const signatures = await generateSignatures(privateKeys.slice(INITIAL_NUMBER_OF_VOTERS, INITIAL_NUMBER_OF_VOTERS + 51).map(x => x.privateKey), messageHash, 51);

        const relayMessage = {
            signingPolicy: initialSigningPolicy,
            signatures,
            protocolMessageMerkleRoot: messageData,
        };

        const fullData = RelayMessage.encode(relayMessage);

        const tx = await web3.eth.sendTransaction({
            from: accounts[0],
            to: relay.address,
            data: RELAY_SELECTOR + fullData.slice(2),
        });
        console.log(tx.gasUsed);
        expect((await submission.getCurrentRandomWithQuality())[1]).to.be.true;
    });

    it("Should select vote power block", async () => {
        await time.increase(1); // new random is later than random acquisition start
        expectEvent(await flareSystemsManager.daemonize(), "VotePowerBlockSelected", { rewardEpochId: toBN(1) });
    });

    it("Should register a few voters", async () => {
        const rewardEpochId = 1;
        for (let i = 0; i < 4; i++) {
            const hash = web3.utils.keccak256(web3.eth.abi.encodeParameters(
                ["uint24", "address"],
                [rewardEpochId, registeredCAddresses[i]]));

            const signature = web3.eth.accounts.sign(hash, privateKeys[30 + i].privateKey);
            expectEvent(await voterRegistry.registerVoter(registeredCAddresses[i], signature),
                "VoterRegistered", { voter: registeredCAddresses[i], rewardEpochId: toBN(1), signingPolicyAddress: accounts[30 + i], submitAddress: accounts[10 + i], submitSignaturesAddress: accounts[20 + i] });
        }
    });

    it("Should initialise new signing policy", async () => {
        for (let i = 0; i < 20; i++) {
            await time.advanceBlock(); // create required number of blocks to proceed
        }
        await time.increaseTo(now.addn(REWARD_EPOCH_DURATION_IN_SEC - 3600)); // at least 30 minutes from the vote power block selection
        const startVotingRoundId = FIRST_REWARD_EPOCH_START_VOTING_ROUND_ID + REWARD_EPOCH_DURATION_IN_VOTING_EPOCHS;
        newSigningPolicy = {
            rewardEpochId: 1,
            startVotingRoundId: startVotingRoundId,
            threshold: Math.floor(65535 / 2),
            seed: web3.utils.keccak256(RANDOM_ROOT),
            voters: accounts.slice(30, 34),
            weights: [34664, 20660, 6334, 3875]
        };

        const receipt = await flareSystemsManager.daemonize();
        await expectEvent.inTransaction(receipt.tx, relay, "SigningPolicyInitialized",
            {
                rewardEpochId: toBN(1), startVotingRoundId: toBN(startVotingRoundId), voters: newSigningPolicy.voters,
                seed: toBN(web3.utils.keccak256(RANDOM_ROOT)), threshold: toBN(32767), weights: newSigningPolicy.weights.map(x => toBN(x))
            });
        const { _lastInitializedRewardEpoch, _startingVotingRoundIdForLastInitializedRewardEpoch } = (await relay.lastInitializedRewardEpochData()) as any;
        expect(_lastInitializedRewardEpoch.toString()).to.equal("1");
        expect(_startingVotingRoundIdForLastInitializedRewardEpoch.toString()).to.equal(startVotingRoundId.toString());
        expect(await relay.toSigningPolicyHash(1)).to.be.equal(getSigningPolicyHash(newSigningPolicy));
    });

    it("Should sign new signing policy and relay it", async () => {
        const rewardEpochId = 1;
        // const newSigningPolicyHash = getSigningPolicyHash(newSigningPolicy)
        const newSigningPolicyHash = await relay.toSigningPolicyHash(rewardEpochId);

        let signatures = (51).toString(16).padStart(4, "0");
        for (let i = 0; i < 50; i++) {
            const signature = web3.eth.accounts.sign(newSigningPolicyHash, privateKeys[INITIAL_NUMBER_OF_VOTERS + i].privateKey);
            expectEvent(await flareSystemsManager.signNewSigningPolicy(rewardEpochId, newSigningPolicyHash, signature), "SigningPolicySigned",
                { rewardEpochId: toBN(rewardEpochId), signingPolicyAddress: accounts[INITIAL_NUMBER_OF_VOTERS + i], voter: accounts[i], thresholdReached: false });
            signatures += ECDSASignatureWithIndex.encode({
                v: parseInt(signature.v.slice(2), 16),
                r: signature.r,
                s: signature.s,
                index: i
            }).slice(2);
        }
        const signature = web3.eth.accounts.sign(newSigningPolicyHash, privateKeys[INITIAL_NUMBER_OF_VOTERS + 50].privateKey);
        expectEvent(await flareSystemsManager.signNewSigningPolicy(rewardEpochId, newSigningPolicyHash, signature), "SigningPolicySigned",
            { rewardEpochId: toBN(rewardEpochId), signingPolicyAddress: accounts[INITIAL_NUMBER_OF_VOTERS + 50], voter: accounts[50], thresholdReached: true });
        signatures += ECDSASignatureWithIndex.encode({
            v: parseInt(signature.v.slice(2), 16),
            r: signature.r,
            s: signature.s,
            index: 50
        }).slice(2);

        const signingPolicyEncoded = SigningPolicy.encode(initialSigningPolicy).slice(2);
        const newSigningPolicyEncoded = SigningPolicy.encode(newSigningPolicy).slice(2);
        const fullData = RELAY_SELECTOR + signingPolicyEncoded + "00" + newSigningPolicyEncoded + signatures;

        const { _lastInitializedRewardEpoch } = (await relay2.lastInitializedRewardEpochData()) as any;
        expect(_lastInitializedRewardEpoch.toString()).to.equal("0");        

        const txReceipt = await web3.eth.sendTransaction({
            from: accounts[0],
            to: relay2.address,
            data: fullData,
        });

        await expectEvent.inTransaction(txReceipt.transactionHash, relay2, "SigningPolicyRelayed", { rewardEpochId: toBN(rewardEpochId) });
        const data = (await relay2.lastInitializedRewardEpochData()) as any;
        expect(data._lastInitializedRewardEpoch.toString()).to.equal(rewardEpochId.toString());
    });

    it("Should start new reward epoch, initiate new voting round and offer rewards for the next reward epoch", async () => {
        await time.increaseTo(now.addn(REWARD_EPOCH_DURATION_IN_SEC));
        expect((await flareSystemsManager.getCurrentRewardEpochId()).toNumber()).to.be.equal(0);
        const tx = await flareSystemsManager.daemonize();
        expectEvent(tx, "RewardEpochStarted");
        await expectEvent.inTransaction(tx.tx, submission, "NewVotingRoundInitiated");
        await expectEvent.inTransaction(tx.tx, ftsoRewardOffersManager, "InflationRewardsOffered", { rewardEpochId: toBN(2), amount: toBN("133333333333333333333333") });
        await expectEvent.inTransaction(tx.tx, ftsoRewardOffersManager, "InflationRewardsOffered", { rewardEpochId: toBN(2), amount: toBN("66666666666666666666667") });
        await expectEvent.inTransaction(tx.tx, validatorRewardOffersManager, "InflationRewardsOffered", { rewardEpochId: toBN(2), amount: toBN("200000000000000000000000") });
        expect((await flareSystemsManager.getCurrentRewardEpochId()).toNumber()).to.be.equal(1);
    });

    it("Should commit", async () => {
        for (let i = 0; i < 4; i++) {
            expect(await submission.submit1.call({ from: accounts[10 + i] })).to.be.true;
            await submission.submit1({ from: accounts[10 + i] });
            expect(await submission.submit1.call({ from: accounts[10 + i] })).to.be.false;
        }
    });

    it("Should initiate new voting round", async () => {
        await time.increaseTo(now.addn(REWARD_EPOCH_DURATION_IN_SEC + VOTING_EPOCH_DURATION_SEC));
        const tx = await flareSystemsManager.daemonize();
        await expectEvent.inTransaction(tx.tx, submission, "NewVotingRoundInitiated");
    });

    it("Should reveal", async () => {
        for (let i = 0; i < 4; i++) {
            expect(await submission.submit2.call({ from: accounts[10 + i] })).to.be.true;
        }
    });

    it("Should deposit signature", async () => {
        for (let i = 0; i < 4; i++) {
            expect(await submission.submitSignatures.call({ from: accounts[20 + i] })).to.be.true;
        }
    });

    it("Should finalise and relay", async () => {
        const votingRoundId = FIRST_REWARD_EPOCH_START_VOTING_ROUND_ID + REWARD_EPOCH_DURATION_IN_VOTING_EPOCHS;
        const quality = true;

        feed = {
            votingRoundId: votingRoundId,
            id: FtsoConfigurations.encodeFeedId({ category: 1, name: "BTC/USD" }),
            value: 12345,
            turnoutBIPS: 6500,
            decimals: 1
        };

        const root = web3.utils.keccak256(web3.eth.abi.encodeParameters(
            ["uint32", "bytes21", "int32", "uint16", "int8"],
            [feed.votingRoundId, feed.id, feed.value, feed.turnoutBIPS, feed.decimals]));

        const messageData: IProtocolMessageMerkleRoot = { protocolId: FTSO_PROTOCOL_ID, votingRoundId: votingRoundId, isSecureRandom: quality, merkleRoot: root };
        const messageHash = ProtocolMessageMerkleRoot.hash(messageData);

        const signatures = await generateSignatures(privateKeys.slice(30, 34).map(x => x.privateKey), messageHash, 4);

        const relayMessage = {
            signingPolicy: newSigningPolicy,
            signatures,
            protocolMessageMerkleRoot: messageData,
        };

        const fullData = RelayMessage.encode(relayMessage);

        await web3.eth.sendTransaction({
            from: accounts[0],
            to: relay.address,
            data: RELAY_SELECTOR + fullData.slice(2),
        });
        expect(await relay.merkleRoots(FTSO_PROTOCOL_ID, votingRoundId)).to.be.equal(root);
        expect((await submission.getCurrentRandom()).eq(toBN(web3.utils.keccak256(root)))).to.be.true;
        expect((await submission.getCurrentRandomWithQuality())[1]).to.be.true;

        expect(await relay2.isFinalized(FTSO_PROTOCOL_ID, votingRoundId)).to.be.false;
        await web3.eth.sendTransaction({
            from: accounts[0],
            to: relay2.address,
            data: RELAY_SELECTOR + fullData.slice(2),
        });
        expect(await relay2.isFinalized(FTSO_PROTOCOL_ID, votingRoundId)).to.be.true;
    });

    it("Should publish ftso feed", async () => {
        const feedWithProof = { body: feed, merkleProof: [] };
        const tx = await ftsoFeedPublisher.publish([feedWithProof]);
        expectEvent(tx, "FtsoFeedPublished", { votingRoundId: toBN(feed.votingRoundId), id: feed.id.padEnd(66, "0"), value: toBN(feed.value), turnoutBIPS: toBN(feed.turnoutBIPS), decimals: toBN(feed.decimals) });
        const feedReturn = await ftsoFeedPublisher.getCurrentFeed(feed.id);
        expect(feedReturn.votingRoundId).to.be.equal(feed.votingRoundId.toString());
        expect(feedReturn.id).to.be.equal(feed.id);
        expect(feedReturn.value).to.be.equal(feed.value.toString());
        expect(feedReturn.turnoutBIPS).to.be.equal(feed.turnoutBIPS.toString());
        expect(feedReturn.decimals).to.be.equal(feed.decimals.toString());
    });

    it("Should convert feed id", async () => {
        const category = 1;
        const name = "BTC/USD";
        const encodedFeedId = FtsoConfigurations.encodeFeedId({ category, name });
        const feedId = FtsoConfigurations.decodeFeedIds(encodedFeedId)[0];
        const encodedFeedId2 = await ftsoFeedIdConverter.getFeedId(category, name);
        expect(encodedFeedId2).to.be.equal(encodedFeedId);
        const feedId2 = await ftsoFeedIdConverter.getFeedCategoryAndName(encodedFeedId);
        expect(category).to.be.equal(feedId.category);
        expect(name).to.be.equal(feedId.name);
        expect(category).to.be.equal(feedId2[0]);
        expect(name).to.be.equal(feedId2[1]);
    });

    it("Should commit 2", async () => {
        for (let i = 0; i < 4; i++) {
            expect(await submission.submit1.call({ from: accounts[10 + i] })).to.be.true;
        }
    });

    it("Should start random acquisition for reward epoch 2", async () => {
        await time.increaseTo(now.addn(2 * REWARD_EPOCH_DURATION_IN_SEC - NEW_SIGNING_POLICY_INITIALIZATION_START_SEC)); // 2 hours before new reward epoch
        expectEvent(await flareSystemsManager.daemonize(), "RandomAcquisitionStarted", { rewardEpochId: toBN(2) });
    });

    it("Should get good random for reward epoch 2", async () => {
        const votingRoundId = FIRST_REWARD_EPOCH_START_VOTING_ROUND_ID + 2 * REWARD_EPOCH_DURATION_IN_VOTING_EPOCHS -
            NEW_SIGNING_POLICY_INITIALIZATION_START_SEC / VOTING_EPOCH_DURATION_SEC + 1;
        const quality = true;

        const messageData: IProtocolMessageMerkleRoot = { protocolId: FTSO_PROTOCOL_ID, votingRoundId: votingRoundId, isSecureRandom: quality, merkleRoot: RANDOM_ROOT2 };
        const messageHash = ProtocolMessageMerkleRoot.hash(messageData);

        const signatures = await generateSignatures(privateKeys.slice(30, 34).map(x => x.privateKey), messageHash, 4);

        const relayMessage = {
            signingPolicy: newSigningPolicy,
            signatures,
            protocolMessageMerkleRoot: messageData,
        };

        const fullData = RelayMessage.encode(relayMessage);

        await web3.eth.sendTransaction({
            from: accounts[0],
            to: relay.address,
            data: RELAY_SELECTOR + fullData.slice(2),
        });
        expect((await submission.getCurrentRandomWithQuality())[1]).to.be.true;
    });

    it("Should select vote power block for reward epoch 2", async () => {
        expectEvent(await flareSystemsManager.daemonize(), "VotePowerBlockSelected", { rewardEpochId: toBN(2) });
    });

    it("Should register a few voters for reward epoch 2", async () => {
        const rewardEpochId = 2;
        for (let i = 0; i < 4; i++) {
            const hash = web3.utils.keccak256(web3.eth.abi.encodeParameters(
                ["uint24", "address"],
                [rewardEpochId, registeredCAddresses[i]]));

            const signature = web3.eth.accounts.sign(hash, privateKeys[30 + i].privateKey);
            expectEvent(await voterRegistry.registerVoter(registeredCAddresses[i], signature),
                "VoterRegistered", { voter: registeredCAddresses[i], rewardEpochId: toBN(2), signingPolicyAddress: accounts[30 + i], submitAddress: accounts[10 + i], submitSignaturesAddress: accounts[20 + i] });
        }
    });

    it("Should initialise new signing policy for reward epoch 2", async () => {
        for (let i = 0; i < 20; i++) {
            await time.advanceBlock(); // create required number of blocks to proceed
        }
        await time.increaseTo(now.addn(2 * REWARD_EPOCH_DURATION_IN_SEC - 3600)); // at least 30 minutes from the vote power block selection
        const votingRoundId = FIRST_REWARD_EPOCH_START_VOTING_ROUND_ID + 2 * REWARD_EPOCH_DURATION_IN_VOTING_EPOCHS;
        const receipt = await flareSystemsManager.daemonize()
        await expectEvent.inTransaction(receipt.tx, relay, "SigningPolicyInitialized",
            {
                rewardEpochId: toBN(2), startVotingRoundId: toBN(votingRoundId), voters: accounts.slice(30, 34),
                seed: toBN(web3.utils.keccak256(RANDOM_ROOT2)), threshold: toBN(32767), weights: [toBN(34664), toBN(20660), toBN(6334), toBN(3875)]
            });
        // tempSigningPolicyEncoded = SigningPolicy.encode({
        //     rewardEpochId: 2,
        //     startVotingRoundId: votingRoundId,
        //     voters: accounts.slice(30, 34),
        //     seed: web3.utils.keccak256(RANDOM_ROOT2),
        //     threshold: 32767,
        //     weights: [34664, 20660, 6334, 3875]
        // })

    });

    it("Should sign new signing policy for reward epoch 2", async () => {
        const rewardEpochId = 2;
        // const newSigningPolicyHash = SigningPolicy.hashEncoded(tempSigningPolicyEncoded)
        const newSigningPolicyHash = await relay.toSigningPolicyHash(rewardEpochId);

        const signature = web3.eth.accounts.sign(newSigningPolicyHash, privateKeys[31].privateKey);
        expectEvent(await flareSystemsManager.signNewSigningPolicy(rewardEpochId, newSigningPolicyHash, signature), "SigningPolicySigned",
            { rewardEpochId: toBN(rewardEpochId), signingPolicyAddress: accounts[31], voter: registeredCAddresses[1], thresholdReached: false });
        const signature2 = web3.eth.accounts.sign(newSigningPolicyHash, privateKeys[30].privateKey);
        expectEvent(await flareSystemsManager.signNewSigningPolicy(rewardEpochId, newSigningPolicyHash, signature2), "SigningPolicySigned",
            { rewardEpochId: toBN(rewardEpochId), signingPolicyAddress: accounts[30], voter: registeredCAddresses[0], thresholdReached: true });
        const signature3 = web3.eth.accounts.sign(newSigningPolicyHash, privateKeys[32].privateKey);
        await expectRevert(flareSystemsManager.signNewSigningPolicy(rewardEpochId, newSigningPolicyHash, signature3), "new signing policy already signed");

    });

    it("Should start new reward epoch (2) and initiate new voting round", async () => {
        await time.increaseTo(now.addn(2 * REWARD_EPOCH_DURATION_IN_SEC));
        expect((await flareSystemsManager.getCurrentRewardEpochId()).toNumber()).to.be.equal(1);
        const tx = await flareSystemsManager.daemonize();
        expectEvent(tx, "RewardEpochStarted");
        await expectEvent.inTransaction(tx.tx, submission, "NewVotingRoundInitiated");
        expect((await flareSystemsManager.getCurrentRewardEpochId()).toNumber()).to.be.equal(2);
    });

    it("Should submit some uptime votes for reward epoch 1", async () => {
        const rewardEpochId = 1;
        for (let i = 0; i < 4; i++) {
            const hash = web3.utils.keccak256(web3.eth.abi.encodeParameters(
                ["uint24", "bytes20[]"],
                [rewardEpochId, nodeIds]));

            const signature = web3.eth.accounts.sign(hash, privateKeys[30 + i].privateKey);
            expectEvent(await flareSystemsManager.submitUptimeVote(rewardEpochId, nodeIds, signature),
                "UptimeVoteSubmitted", { voter: registeredCAddresses[i], rewardEpochId: toBN(1), signingPolicyAddress: accounts[30 + i], nodeIds: nodeIds });
        }
    });

    it("Should sign uptime vote for reward epoch 1", async () => {
        for (let i = 0; i < 20; i++) {
            await time.advanceBlock(); // create required number of blocks to proceed
        }
        await time.increaseTo(now.addn(2 * REWARD_EPOCH_DURATION_IN_SEC + 3600)); // at least 10 minutes from the new reward epoch start
        const tx = await flareSystemsManager.daemonize();
        expectEvent(tx, "SignUptimeVoteEnabled", { rewardEpochId: toBN(1) });
        const rewardEpochId = 1;
        const uptimeVoteHash = web3.utils.keccak256("uptime");
        const hash = web3.utils.keccak256(web3.eth.abi.encodeParameters(
            ["uint24", "bytes32"],
            [rewardEpochId, uptimeVoteHash]));

        const signature = web3.eth.accounts.sign(hash, privateKeys[31].privateKey);
        expectEvent(await flareSystemsManager.signUptimeVote(rewardEpochId, uptimeVoteHash, signature), "UptimeVoteSigned",
            { rewardEpochId: toBN(1), signingPolicyAddress: accounts[31], voter: registeredCAddresses[1], thresholdReached: false });
        const signature2 = web3.eth.accounts.sign(hash, privateKeys[30].privateKey);
        expectEvent(await flareSystemsManager.signUptimeVote(rewardEpochId, uptimeVoteHash, signature2), "UptimeVoteSigned",
            { rewardEpochId: toBN(1), signingPolicyAddress: accounts[30], voter: registeredCAddresses[0], thresholdReached: true });
        const signature3 = web3.eth.accounts.sign(hash, privateKeys[32].privateKey);
        await expectRevert(flareSystemsManager.signUptimeVote(rewardEpochId, uptimeVoteHash, signature3), "uptime vote hash already signed");
        expect(await flareSystemsManager.uptimeVoteHash(rewardEpochId)).to.be.equal(uptimeVoteHash);
    });

    it("Should sign rewards for reward epoch 1", async () => {
        const rewardEpochId = 1;
        const noOfWeightBasedClaims = [{ rewardManagerId: REWARD_MANAGER_ID, noOfWeightBasedClaims: 1 }];

        rewardClaim = {
            rewardEpochId: 1,
            beneficiary: accounts[50],
            amount: 500,
            claimType: 2 //IRewardManager.ClaimType.WNAT
        }

        const rewardsVoteHash = web3.utils.keccak256(web3.eth.abi.encodeParameters(
            ["uint24", "bytes20", "uint120", "uint8"],
            [rewardClaim.rewardEpochId, rewardClaim.beneficiary, rewardClaim.amount, rewardClaim.claimType]));
        const noOfWeightBasedClaimsHash = web3.utils.keccak256(web3.eth.abi.encodeParameters(
            ["tuple(uint256,uint256)[]"],
            [noOfWeightBasedClaims.map(value => [value.rewardManagerId, value.noOfWeightBasedClaims])]));
        const hash = web3.utils.keccak256(web3.eth.abi.encodeParameters(
            ["uint24", "bytes32", "bytes32"],
            [rewardEpochId, noOfWeightBasedClaimsHash, rewardsVoteHash]));

        const signature = web3.eth.accounts.sign(hash, privateKeys[31].privateKey);
        expectEvent(await flareSystemsManager.signRewards(rewardEpochId, noOfWeightBasedClaims, rewardsVoteHash, signature), "RewardsSigned",
            { rewardEpochId: toBN(1), signingPolicyAddress: accounts[31], voter: registeredCAddresses[1], thresholdReached: false });
        const signature2 = web3.eth.accounts.sign(hash, privateKeys[30].privateKey);
        expectEvent(await flareSystemsManager.signRewards(rewardEpochId, noOfWeightBasedClaims, rewardsVoteHash, signature2), "RewardsSigned",
            { rewardEpochId: toBN(1), signingPolicyAddress: accounts[30], voter: registeredCAddresses[0], thresholdReached: true });
        const signature3 = web3.eth.accounts.sign(hash, privateKeys[32].privateKey);
        await expectRevert(flareSystemsManager.signRewards(rewardEpochId, noOfWeightBasedClaims, rewardsVoteHash, signature3), "rewards hash already signed");
        expect(await flareSystemsManager.rewardsHash(rewardEpochId)).to.be.equal(rewardsVoteHash);
        expect((await flareSystemsManager.noOfWeightBasedClaims(rewardEpochId, REWARD_MANAGER_ID)).toNumber()).to.be.equal(noOfWeightBasedClaims[0].noOfWeightBasedClaims);
    });

    it("Should claim the reward for reward epoch 1", async () => {
        const balanceBefore = await wNat.balanceOf(accounts[200]);
        const tx = await rewardManager.claim(accounts[50],
            accounts[200],
            1,
            true,
            [{ body: rewardClaim, merkleProof: [] }],
            { from: accounts[50] }
        );
        const balanceAfter = await wNat.balanceOf(accounts[200]);

        expectEvent(tx, "RewardClaimed", { beneficiary: accounts[50], rewardOwner: accounts[50], recipient: accounts[200], rewardEpochId: toBN(1), claimType: toBN(2), amount: toBN(500) });
        expect(balanceAfter.sub(balanceBefore).toNumber()).to.be.equal(500);
    });

    it("Should create new PollingFoundation proposal and vote on it", async () => {
        let tx = await pollingFoundation.methods["propose(string,(bool,uint256,uint256,uint256,uint256,uint256))"].sendTransaction("Proposal",
            {
                accept: false,
                votingStartTs: (await time.latest()).addn(3600).toNumber(),
                votingPeriodSeconds: 7200,
                vpBlockPeriodSeconds: 259200,
                thresholdConditionBIPS: 7500,
                majorityConditionBIPS: 5000
            }, { from: accounts[10] }) as any;

        let proposalId = tx.logs[0].args.proposalId.toString();

        // advance one hour to the voting period
        await time.increase(3600);

        // voting
        await pollingFoundation.castVote(proposalId, 0, { from: registeredCAddresses[0] });
        await pollingFoundation.castVote(proposalId, 1, { from: registeredCAddresses[1] });
        await pollingFoundation.castVote(proposalId, 0, { from: registeredCAddresses[2] });

        // advance to the end of the voting period
        await time.increase(7200);

        let state = await pollingFoundation.state(proposalId);
        expect(state.toString()).to.equals("2");
    });

    it("Should create new PollingFtso proposal and vote on it", async () => {
        const proposalId = toBN(1);
        let tx = await pollingFtso.propose("Proposal", { value: toBN(100), from: registeredCAddresses[0] });
        expectEvent(tx, "FtsoProposalCreated", { proposalId: proposalId, proposer: registeredCAddresses[0] });

        // advance one hour to the voting period
        await time.increase(3600);

        // voting
        await pollingFtso.castVote(proposalId, 1, { from: registeredCAddresses[0] });
        await pollingFtso.castVote(proposalId, 1, { from: registeredCAddresses[1] });
        await pollingFtso.castVote(proposalId, 0, { from: registeredCAddresses[2] });

        // advance to the end of the voting period
        await time.increase(3600);

        let state = await pollingFtso.state(proposalId);
        expect(state.toString()).to.equals("4");
    });

});
