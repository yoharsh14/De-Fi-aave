1. Deposit collateral: ETH/WETH ✅
2. Borrow another asset: DAI ✅
3. Repay the DAI

// FORKING
// TradeOffs

Pros: Quick,easy,resemble what's on mainnet
Cons: We need an API, some contracts are complex to work with


Process:

# Depositing
## getWeth:
   - First we have to get weth from the getWeth contract
   - we used the mainnet contract address 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
   - In this process we used forking techinque. 
   - In forking we can interact with same blockchain.
   - After we got weth in our wallet
## Lending pool
   - we have to get the address of lending pool
   - we deposit the weth in lending pool
## Lending pool address provider
 - there are multiple lending pool
 - so we have to get the address of the lending pool in order to depoist our WETH
 - we use the lendingPoolAddressProvider interface to get the address of lendingPool.
## lending pool
```async function getLendingPool(account)```
   - Now that we have the address of the lending pool
   - we can get the access using the address of lending pool.
   - Now we can deposit but but but before depositing we need to give access aave to get WETH from wallet.
   - We need to approve IERC20 so that it can access wallet
## IERC20
   ```async function approveErc20(erc20Address, spenderAddress, amountToSpend, account)```
   - With the help of function of IERC20 contract.
   - We can approve for the access of our wallet.
## Depositing
   ```await lendingPool.deposit(address asset,uint256 amount,address onBehalfOf,uint16 referralCode)```
   - using above line we can deposit we in the leding pool.

# Borrowing
## getBorrowUserData
 - Before borrowing we need to know about 
   - how much we can borrow
   - how much we have in collatoral
   - how much we have borrowed
- liquidation concept
   - we you have 1ETH collatoral and borrowed 1.8ETH then you will get liquidated
   - Liquidation Threshold: The liquidation threshold is the percentrage at which a person is defined as
      undercollateralised. For example, a Liquidation threshold of 80% means that if the value rises above 80%
       of the collateral, the position is undercollateralised and could be liquidated.
   - if you have borrowed money more than you put up then people can take your collateral because they are paying for your loans.

## GetDaiPrice
- Now we have info about how much can buy and how much debt we have
 - before borrowing the DAI we need the conversion rate of ETH-DAI.
 - for this we are going to use chainlink priceFeeds.

## BorrwoDai
- Now that we know the exchange price of DAI/EHT
- we can borrow the DAI 