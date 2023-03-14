const { getNamedAccounts, ethers } = require("hardhat");
const { getWeth, AMOUNT } = require("../scripts/getWeth");
async function main() {
    // the protocol treats everthing as an ERC20 token
    // Got the weth token
    await getWeth();
    const { deployer } = await getNamedAccounts();
    /* interacting with aave protocol: In order to interact with 
     aave protocol we have to interact with lending pools.
     we need abi, contract address
     lending pool address provider: 0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5
     Lending pool:
    */
    const lendingPool = await getLendingPool(deployer);
    console.log(`Lending Pool Address ${lendingPool.address}`);

    /**Depositing process!
     * In order to deposit we need to give aave contract access to our wallet.
     * Now in order to give the aave contract ability to take Weth from our wallet
     * we need to approve the contract, using function approve which is in contract IERC20.sol
     * NOW WE ARE APPROVING THE AAVE CONTRACT.
     */
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    // APPROVING
    await approveErc20(wethTokenAddress, lendingPool.address, AMOUNT, deployer);

    /** Now that we have approved the aave contract the access of our wallet.
     * We can now deposit our Weth token from our wallet to the pool.
     */
    console.log("Depositing...");
    // deposit(address asset,uint256 amount,address onBehalfOf,uint16 referralCode)
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
    console.log("------------DEPOSITED----------------")
}
async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt(
        "ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
        account
    );

    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool();

    /*
     we have the address of lending pool but now we have to get that
     lending pool abi(using interface) using the lending pool address
    */
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account);
    return lendingPool;
}

async function approveErc20(erc20Address, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address);
    const tx = await erc20Token.approve(spenderAddress, amountToSpend);
    await tx.wait(1);
    console.log("Approved!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
