import './App.css';
import * as anchor from '@project-serum/anchor';
import React, {useState, useEffect } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, BN, Provider, web3 } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import Button from '@material-ui/core/Button';
import { getPhantomWallet } from '@solana/wallet-adapter-wallets';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import axios from "axios";
import idl from './idl.json';
import { getParsedNftAccountsByOwner, decodeTokenMetadata } from "@nfteyez/sol-rayz";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";

require('@solana/wallet-adapter-react-ui/styles.css')

const wallets = [ new getPhantomWallet() ];

const { SystemProgram, Keypair } = web3;

const network = 'https://api.devnet.solana.com';

const opts = {
  preflightCommitment: "confirmed"
}

const programID = new PublicKey(idl.metadata.address);


  /////////////////////////////////////////////////////////////Component////////////////////////////////////////////  



const App = () => {

  const wallet = useWallet();

  const [nftObjData, setNftObjData] = useState();
  const [escrowDataMarket, setEscrowDataMarket] = useState([]);
  const [escrowDataUser, setEscrowDataUser] = useState([]);
  const [priceNow, setPriceNow] = useState(1);
  const [pageState, setPageState] = useState(0);

  useEffect(() => {
    console.log("nftObjData: ", nftObjData);
  },[nftObjData]);

  useEffect(() => {
    console.log("escrowDataMarket: ", escrowDataMarket);
  },[escrowDataMarket]);

  useEffect(() => {
    console.log("escrowDataUser: ", escrowDataUser);
  },[escrowDataUser]);

  

  const onChange = (e) => {
    setPriceNow(e.currentTarget.value);
  };
  
  async function getProvider() {
    const connection = new Connection(network, opts.preflightCommitment);

    const provider = new Provider(
      connection, wallet, opts.preflightCommitment,
    );

    return provider;
  }

  async function getEscrowAccountList() {
    const provider = await getProvider();

    const program = new Program(idl, programID, provider);
    // console.log('program', program);

    const tokens = await program.account.escrowAccount.all();
    let escrows = [];
    tokens.map(token => {escrows.push(token)});
    return escrows;
  }

  async function getMarketplaceNFTList() {
    setPageState(1);
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, wallet, opts.preflightCommitment,
    );
    let mints = getEscrowAccountList();
    let escrows = [];
    //setEscrowDataMarket(escrows);
    (await mints).map(async (item) => 
    {
      if(item.account.isInitialized)
      {
        if(item.account.seller != provider.wallet.publicKey.toBase58())
        {
          let metadata = getTokenMetaData(item.account.mintKey);
          console.log(metadata);
          if(metadata != null)
          {
            let escrow = {
              name: '',
              escrow: item.publicKey,
              price: parseFloat(BN(item.account.amount)) / 1000000000,
              mint: item.account.mintKey,
              seller: item.account.seller,
              tokenAccount: item.account.tokenAccountPubkey.toBase58(),
            };
            console.log("escrow: ", escrow.escrow.toBase58());
            escrows.push(escrow);
          }
        }
      }
    });
    setEscrowDataMarket(escrows);
  }

  async function getUserNFTSALE() {
    setPageState(2);
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, wallet, opts.preflightCommitment,
    );
    let mints = getEscrowAccountList();
    let escrows = [];
    //setEscrowDataMarket(escrows);
    (await mints).map(async (item) => 
    {
      if(item.account.isInitialized)
      {
        if(item.account.seller == provider.wallet.publicKey.toBase58())
        {
          let metadata = getTokenMetaData(item.account.mintKey);
          console.log(metadata);
          if(metadata != null)
          {
            let escrow = {
              name: '',
              escrow: item.publicKey,
              price: parseFloat(BN(item.account.amount)) / 1000000000,
              mint: item.account.mintKey,
              seller: item.account.seller,
              tokenAccount: item.account.tokenAccountPubkey.toBase58(),
            };
            console.log("escrow: ", escrow.escrow.toBase58());
            escrows.push(escrow);
          }
        }
      }
    });
    setEscrowDataUser(escrows);
  }

  //Get Metadata of Metaplex NFT
  async function getTokenMetaData(mintPubkey) {
    try{
      const connection = new Connection(network, opts.preflightCommitment);
      let tokenmetaPubkey = await Metadata.getPDA(mintPubkey);
      const tokenmeta = await Metadata.load(connection, tokenmetaPubkey);
      return tokenmeta;
    }
    catch(error)
    {
      console.log(error);
      return null;
    }
  }

  //Get Collectibles of User Wallet
  async function getUserNFTs(){
    const provider = await getProvider();
    let connection = new Connection(network, opts.preflightCommitment);

    const nfts = await getParsedNftAccountsByOwner({
      publicAddress: provider.wallet.publicKey,
      connection: connection,
      serialization: true,
    });
    console.log(provider.wallet.publicKey.toBase58());

    return nfts;
  }

//Function to get all nft data
async function getUserNFTDataList() {
  setPageState(0);
  try {
    let nftData = await getUserNFTs();
    var data = Object.keys(nftData).map((key) => nftData[key]);                                                                    
    let n = data.length;
    let nfts = [];
    for (let i = 0; i < n; i++) {
      console.log(data[i]);
      let val = await axios.get(data[i].data.uri);

      //Properties of NFT
      let nft_name = val.data.name;
      let nft_description = val.data.description;
      let nft_img = val.data.image;
      let nft_account = data[i].mint;
      // let nft_sellerFeeBasePoint = temp.data.sellerFeeBasePoint;

      //Find Current Buyer
      let connection = new Connection(network, opts.preflightCommitment);
      const largestAccounts = await connection.getTokenLargestAccounts(new PublicKey(nft_account));
      // const largestAccountInfo = await connection.getParsedAccountInfo(largestAccounts.value[0].address);

      const nft_holderAccount = largestAccounts.value[0].address.toBase58();
      console.log("nft_holderAccount", nft_holderAccount);
      let nft = {
        name: nft_name,
        description: nft_description,
        img: nft_img,
        nftAccount: nft_account,
        holderAccount: nft_holderAccount,
        // sellerFeeBasePoint: nft_sellerFeeBasePoint,
      };

      nfts.push(nft);
    }
    setNftObjData(nfts);
    console.log(nfts);
  } catch (error) {
    console.log(error);
  }
};


  // async function CreateNFT() {
  //   const provider = await getProvider();

  //   // await provider.connection.confirmTransaction(
  //   //   await provider.connection.requestAirdrop(buyer.publicKey, 10000000000),
  //   //   "confirmed"
  //   // );

  //   let mint = await Token.createMint(
  //     provider.connection,
  //     seller,
  //     seller.publicKey,
  //     null,
  //     0,
  //     TOKEN_PROGRAM_ID,
  //   );

  //   console.log("wallet", provider.wallet.publicKey.toBase58());
  //   console.log("seller: ", seller.publicKey.toBase58());
  //   console.log("mint: ", mint.publicKey.toBase58());
  //   console.log("program: ", SystemProgram.programId.toBase58());
  //   console.log("token: ", TOKEN_PROGRAM_ID.toBase58());

  //   initializerTokenAccount = await mint.createAccount(
  //     seller.publicKey
  //   );

  //   await mint.mintTo(
  //     initializerTokenAccount,
  //     seller.publicKey,
  //     [seller],
  //     initializerAmount
  //   );

  //   let nft = await mint.getAccountInfo(initializerTokenAccount);
  //   console.log(nft);

  //   console.log("initializerTokenAccount: ", initializerTokenAccount.toBase58());
  // }
  
  //Deposit NFT to Marketplace
  async function initialize(e) {   
    console.log(e.target.id); 
    let tokenAccount = new PublicKey(e.target.id);
    console.log("NFT HolderAccount", tokenAccount.toBase58());
    const provider = await getProvider();

    let nftAccount = null;

    nftObjData.forEach(element => {
      if(element.holderAccount == tokenAccount.toBase58())
        nftAccount = element.nftAccount;
        console.log(nftAccount);
    });

    console.log("priceNow", priceNow);

    const escrowAccount = Keypair.generate();
    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl, programID, provider);
    try {
      /* interact with the program via rpc */
      await program.rpc.list(
        new BN(priceNow * 1000000000), {
        accounts: {
          initializer: provider.wallet.publicKey,
          initializerTokenAccount: tokenAccount,
          mintKey: nftAccount,
          escrowAccount: escrowAccount.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        signers: [escrowAccount],
      });

      const account = await program.account.escrowAccount.fetch(escrowAccount.publicKey);
      console.log('escrowAccount', escrowAccount.publicKey.toBase58());
      console.log('account.tokenAccountPubkey: ', account.tokenAccountPubkey.toBase58());

      console.log("List Success!");
      getUserNFTDataList(); 
    } catch (err) {
      console.log("Transaction error: ", err);
    }
  }

  //Buy NFT in Marketplace
  async function buy(e) {
    console.log("buy");
    let tokenAccount = new PublicKey(e.target.id);
    let EscrowAccount = null;
    let sellerAccount = null;
    escrowDataMarket.forEach(element => {
      console.log(element);
      console.log(tokenAccount);
      if(element.tokenAccount == tokenAccount.toBase58()){
        EscrowAccount = element.escrow;
        sellerAccount = element.seller;
      }
    });

    console.log("SellerAccount", sellerAccount);
    console.log("EscrowAccount", EscrowAccount);

    const provider = await getProvider();
    const program = new Program(idl, programID, provider);

    // Get the PDA that is assigned authority to token account.
    const [_pda, _nonce] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow")), EscrowAccount.toBuffer()],
      program.programId
    );

    const pda = _pda;

    console.log('pda_token_account: ', pda.toBase58());
    
    try{
      await program.rpc.buy({
        accounts: {
          buyer: provider.wallet.publicKey,
          pdaDepositTokenAccount: tokenAccount,
          initializerMainAccount: sellerAccount,
          escrowAccount: EscrowAccount,
          pdaAccount: pda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId
        },
      });
    }
    catch(error){
      console.log(error);
    }

    console.log("buy success!");

    getMarketplaceNFTList();
  }

  //Cancel Deposit of NFT
  async function cancel(e) {
    let tokenAccount = new PublicKey(e.target.id);

    let EscrowAccount = null;
    escrowDataUser.forEach(element => {
      console.log(element);
      console.log(tokenAccount.toBase58());
      if(element.tokenAccount == tokenAccount){
        EscrowAccount = element.escrow;
      }
    });

    if(EscrowAccount != null)
    {
      console.log("EscrowAccount", EscrowAccount.toBase58());

      const provider = await getProvider();
      const program = new Program(idl, programID, provider);
  
      // // Get the PDA that is assigned authority to token account.
      const [_pda, _nonce] = await PublicKey.findProgramAddress(
        [Buffer.from(anchor.utils.bytes.utf8.encode("escrow")), EscrowAccount.toBuffer()],
        program.programId
      );
  
      const pda = _pda;
      try{
        await program.rpc.cancel({
          accounts: {
            user: provider.wallet.publicKey,
            pdaTokenAccount: tokenAccount,
            pdaAccount: pda,
            escrowAccount: EscrowAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
        });
      }
      catch(error){
        console.log(error);
      }
  
      console.log("Cancel Success!");
      getUserNFTSALE();
    }
  }

  if (!wallet.connected) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop:'100px' }}>
        <WalletModalProvider>
            <WalletMultiButton />
        </WalletModalProvider>
      </div>
    )
  } 
  else {
    if(pageState == 0)
    {
      return (
        <div className="App">
          <div style={{ display: 'grid', justifyContent: 'center', marginTop:'100px' }}>
            <div className='price-container'>
              <h2 style={{margin: '30px 60px 30px 30px', width: '180px'}}>Connected to :</h2><br/>
              <h4>{wallet.publicKey.toBase58()}</h4>
            </div>
              <div style={{display: 'flex', justifyContent: 'space-evenly'}}>
              <div className='button-container'>
                <Button onClick={getMarketplaceNFTList} variant="contained">Marketplace</Button>
              </div>
              <div className='button-container'>
                <Button onClick={getUserNFTDataList} variant="contained">My Collection</Button>
              </div>
              <div className='button-container'>
                <Button onClick={getUserNFTSALE} variant="contained">My NFT FOR SALE</Button>
              </div>
            </div>
          </div>
          {nftObjData ? (
            <div style={{display: 'grid', justifyContent: 'center', marginTop:'30px', justifyItems: 'start'}}>
              <div style={{display: 'flex', padding: '10px', alignItems:'center'}}>
                <h5>Price: </h5><input style={{height: '20px'}} onChange={(e) => onChange(e)} placeholder={priceNow}></input><h5>SOL</h5>
              </div>
              {nftObjData.map(item => (
                <div style={{display: 'flex'}}>
                  <div style={{display: 'flex', justifyItems: 'start', width: '800px', border: 'dashed', borderWidth: 'thin'}}>
                    <div style={{display: 'flex'}}>
                      <a href={item.img}><img src={item.img} style={{width: '120px'}}/></a>
                    </div>
                    <div style={{display: 'grid', width: '700px'}}>
                      <p style={{margin: '3px'}}> name: {item.name}</p>
                      <p style={{margin: '3px'}}> description: {item.description}</p>
                      <p style={{margin: '3px'}}> NFT Account: {item.nftAccount}</p>
                      {/* <p style={{margin: '3px'}}> url: {item.url}</p> */}
                    </div>
                  </div>
                  <div style={{display: 'flex', justifyItems: 'start'}}>
                    <div className='button-container' style={{width: '80px', display: 'flex'}}>
                      <button style={{width: '80px'}} onClick = {(e) => {initialize(e)}} id={item.holderAccount}>Sell</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ): (
            <></>
          )}
        </div>
      );
    }
    //Marketplace
    else if(pageState == 1){
      return (
        <div className="App">
          <div style={{ display: 'grid', justifyContent: 'center', marginTop:'100px' }}>
            <div className='price-container'>
              <h2 style={{margin: '30px 60px 30px 30px', width: '180px'}}>Connected to :</h2><br/>
              <h4>{wallet.publicKey.toBase58()}</h4>
            </div>
              <div style={{display: 'flex', justifyContent: 'space-evenly'}}>
              {/* <div className='button-container'>
                <Button onClick = {CreateNFT} variant='contained'>MINT NFT</Button>
              </div> */}
              <div className='button-container'>
                <Button onClick={getMarketplaceNFTList} variant="contained">Marketplace</Button>
              </div>
              <div className='button-container'>
                <Button onClick={getUserNFTDataList} variant="contained">My Collection</Button>
              </div>
              <div className='button-container'>
                <Button onClick={getUserNFTSALE} variant="contained">My NFT FOR SALE</Button>
              </div>
            </div>
          </div>
          {escrowDataMarket ? (
            <div style={{display: 'grid', justifyContent: 'center', marginTop:'30px', justifyItems: 'start'}}>
              {escrowDataMarket.map(item => (
                <div style={{display: 'flex'}}>
                  <div style={{display: 'flex', justifyItems: 'start', width: '800px', border: 'dashed', borderWidth: 'thin'}}>
                    <div style={{display: 'flex'}}>
                      <a href={item.img}><img src={item.img} style={{width: '120px'}}/></a>
                    </div>
                    <div style={{display: 'grid', width: '700px'}}>
                      <p style={{margin: '3px'}}> name: {item.name}</p>
                      <p style={{margin: '3px'}}> price: {item.price}</p>
                      <p style={{margin: '3px'}}> NFT Account: {item.mint.toBase58()}</p>
                      <p style={{margin: '3px'}}> Holder Account: {item.tokenAccount}</p>
                      <p style={{margin: '3px'}}> Seller: {item.seller.toBase58()}</p>
                      {/* <p style={{margin: '3px'}}> url: {item.url}</p> */}
                    </div>
                  </div>
                  <div style={{display: 'flex', justifyItems: 'start'}}>
                    <div className='button-container' style={{width: '80px', display: 'flex'}}>
                      <button style={{width: '80px'}} onClick = {(e) => {buy(e)}} id={item.tokenAccount}>Buy</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ): (
            <></>
          )}
        </div>
      );
    }

    //User NFT For Sale
    else if(pageState == 2){
      return (
        <div className="App">
          <div style={{ display: 'grid', justifyContent: 'center', marginTop:'100px' }}>
            <div className='price-container'>
              <h2 style={{margin: '30px 60px 30px 30px', width: '180px'}}>Connected to :</h2><br/>
              <h4>{wallet.publicKey.toBase58()}</h4>
            </div>
              <div style={{display: 'flex', justifyContent: 'space-evenly'}}>
              {/* <div className='button-container'>
                <Button onClick = {CreateNFT} variant='contained'>MINT NFT</Button>
              </div> */}
              <div className='button-container'>
                <Button onClick={getMarketplaceNFTList} variant="contained">Marketplace</Button>
              </div>
              <div className='button-container'>
                <Button onClick={getUserNFTDataList} variant="contained">My Collection</Button>
              </div>
              <div className='button-container'>
                <Button onClick={getUserNFTSALE} variant="contained">My NFT FOR SALE</Button>
              </div>
            </div>
          </div>
          {escrowDataUser ? (
            <div style={{display: 'grid', justifyContent: 'center', marginTop:'30px', justifyItems: 'start'}}>
              {escrowDataUser.map(item => (
                <div style={{display: 'flex'}}>
                  <div style={{display: 'flex', justifyItems: 'start', width: '800px', border: 'dashed', borderWidth: 'thin'}}>
                    <div style={{display: 'flex'}}>
                      <a href={item.img}><img src={item.img} style={{width: '120px'}}/></a>
                    </div>
                    <div style={{display: 'grid', width: '700px'}}>
                      <p style={{margin: '3px'}}> name: {item.name}</p>
                      <p style={{margin: '3px'}}> price: {item.price} SOL</p>
                      <p style={{margin: '3px'}}> NFT Account: {item.mint.toBase58()}</p>
                      <p style={{margin: '3px'}}> Holder Account: {item.tokenAccount}</p>
                      <p style={{margin: '3px'}}> Seller: {item.seller.toBase58()}</p>
                      {/* <p style={{margin: '3px'}}> url: {item.url}</p> */}
                    </div>
                  </div>
                  <div style={{display: 'flex', justifyItems: 'start'}}>
                    <div className='button-container' style={{width: '80px', display: 'flex'}}>
                      <button style={{width: '80px'}} onClick = {(e) => {cancel(e)}} id={item.tokenAccount}>Cancel</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ): (
            <></>
          )}
        </div>
      );
    }

  }
}

const AppWithProvider = () => (
  <ConnectionProvider endpoint="http://127.0.0.1:8899">
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>
        <App />
      </WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
)

export default AppWithProvider;