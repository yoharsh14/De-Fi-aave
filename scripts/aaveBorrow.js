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
    console.log("------------DEPOSITED----------------");

    /**BORROW TIME!!!
     * - how much we can borrow
     * - how much we have in collatoral
     * - how much we have borrowed
     * --------------------------------------
     * - we you have 1ETH collatoral and borrowed 1.8ETH then you will get liquidated
     * -Liquidation Threshold: The liquidation threshold is the percentrage at which a person is defined as
     *  undercollateralised.For example, a Liquidation threshold of 80% means that if the value rises above 80%
     *  of the collateral, the position is undercollateralised and could be liquidated.
     * - if you have borrowed money more than you put up then people can take your collateral
     *   because they are paying for your loans.
     */
    let {availableBorrowsETH}= await getBorrowUserData(lendingPool, deployer);
    //Now we have info about how much can buy and how much debt we have

    /**
     * BORROW DAI
     * - before borrowing the DAI we need the conversion rate of ETH-DAI
     * - for this we are going to use chainlink priceFeeds
     */
    console.log("-------------------------------------------");
    const daiPrice = await getDaiPrice();
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber());
    console.log(`You can borrow ${amountDaiToBorrow} DAI`);
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString());

    /** Now we know the exhange price of DAI/ETH
     * - we can borrow the DAI
     */
    //BORROWING!!!!!!!
    console.log("---------------------------------------------");
    const daiTokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    await borrwoDai(daiTokenAddress, lendingPool, amountDaiToBorrowWei, deployer);
    console.log("-----------------Your data after Borrowing----------------------");
    await getBorrowUserData(lendingPool, deployer);

    //REPAY
    /** There is a tiny amount of ETH still as borrowed because we still own the interest when 
     * we borrowed the DAI, aave owns use still a small amount of interest on borrowed dai */
    console.log("-----------------------REPAYING-----------------------------")
    await repay(amountDaiToBorrowWei, daiTokenAddress, lendingPool, deployer);
    await getBorrowUserData(lendingPool, deployer);

    console.log("-----------------------REPAYING INTEREST----------------------")
    const {totalDebtETH} = await getBorrowUserData(lendingPool,deployer);

    console.log("-------------------------------------------");
    // const totalDebtDai = totalDebtETH.toString() * (1 / daiPrice.toNumber());
    console.log(`You can borrow ${totalDebtETH} DAI`);
    const totalDebtDaiWei = ethers.utils.parseEther(totalDebtETH.toString());

    await repay(totalDebtDaiWei,daiTokenAddress,lendingPool,deployer);
    console.log("--------------------------ALL THE AMOUNT REPAYED---------------------")
    await getBorrowUserData(lendingPool,deployer);
    // Repaying remainning amount of ETH using uinswap back to aave
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
    const erc20Token = await ethers.getContractAt("IERC20", erc20Address,account);
    const tx = await erc20Token.approve(spenderAddress, amountToSpend);
    await tx.wait(1);
    console.log("Approved!");
}

async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
        await lendingPool.getUserAccountData(account);
    console.log(`You have ${totalCollateralETH} worth of WETH deposited.`);
    console.log(`You have ${totalDebtETH} worth of WETH borrowed.`);
    console.log(`You can borrow ${availableBorrowsETH} worth of WETH.`);
    return  {totalDebtETH, availableBorrowsETH};
}

async function getDaiPrice() {
    // we didn't connected it with the deployer because we are just reading not writting
    const daiEthPriceFeed = await ethers.getContractAt(
        "AggregatorV3Interface",
        "0x773616E4d11A78F511299002da57A0a94577F1f4"
    );
    const price = (await daiEthPriceFeed.latestRoundData())[1];
    console.log(`The DAI/ETH price is ${price.toString()}`);
    return price;
}

async function borrwoDai(daiAddress, lendingPool, amountDaiToBorrowWei, account) {
    const borrowTx = await lendingPool.borrow(daiAddress, amountDaiToBorrowWei, 1, 0, account);
    await borrowTx.wait(1);
    console.log("You've borrowed!!!");
}

async function repay(amount, daiAddress, lendingPool, account) {
    await approveErc20(daiAddress, lendingPool.address, amount, account);
    const repayTx = await lendingPool.repay(daiAddress, amount, 1, account);
    await repayTx.wait(1);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
