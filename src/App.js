import './App.css';
import * as anchor from "@project-serum/anchor";
import {FC, useState, useMemo } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, BN, Provider, web3 } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core';
import idl from './idl.json';
import {
  PhantomWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { getPhantomWallet } from '@solana/wallet-adapter-wallets';
import { useWallet, WalletProvider, ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
require('@solana/wallet-adapter-react-ui/styles.css')

const wallets = [ new getPhantomWallet() ]

const { SystemProgram, Keypair } = web3;

let mint = null;
let initializerTokenAccount = null;

const escrowAccount = Keypair.generate();
const mintAuthority = Keypair.generate();
const payer = Keypair.generate();
const buyer = Keypair.generate();

const initializerAmount = 1000;

const opts = {
  preflightCommitment: "confirmed"
}
const programID = new PublicKey(idl.metadata.address);

function App() {
  const [value, setValue] = useState('');
  const [dataList, setDataList] = useState([]);
  const [input, setInput] = useState('');
  const wallet = useWallet()

  async function getProvider() {
    /* create the provider and return it to the caller */
    /* network set to local network for now */
    // const network = "http://127.0.0.1:8899";
    const network = "http://127.0.0.1:8899";
    const connection = new Connection(network, opts.preflightCommitment);

    const provider = new Provider(
      connection, wallet, opts.preflightCommitment,
    );
    return provider;
  }

  async function CreateNFT() {
    const provider = await getProvider();

    // console.log(wallets);
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(payer.publicKey, 100000000),
      "confirmed"
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(buyer.publicKey, 10000000000),
      "confirmed"
    );

    mint = await Token.createMint(
      provider.connection,
      payer,
      mintAuthority.publicKey,
      null,
      0,
      TOKEN_PROGRAM_ID
    );

    console.log("wallet", provider.wallet.publicKey.toBase58());
    console.log("payer: ", payer.publicKey.toBase58());
    console.log("mint: ", mint.publicKey.toBase58());
    console.log("program: ", SystemProgram.programId.toBase58());
    console.log("token: ", TOKEN_PROGRAM_ID.toBase58());

    initializerTokenAccount = await mint.createAccount(
      provider.wallet.publicKey
    );

    await mint.mintTo(
      initializerTokenAccount,
      mintAuthority.publicKey,
      [mintAuthority],
      initializerAmount
    );

    console.log("initializerTokenAccount: ", initializerTokenAccount.toBase58());
  }

  async function initialize() {    
    const provider = await getProvider();
    console.log("provider.wallet: ", provider.wallet.publicKey);
    /* create the program interface combining the idl, program ID, and provider */
    const program = new Program(idl, programID, provider);
    try {
      /* interact with the program via rpc */
      await program.rpc.list(
        new BN(initializerAmount), {
        accounts: {
          initializer: wallets[0].publicKey,
          initializerTokenAccount: initializerTokenAccount,
          escrowAccount: escrowAccount.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
        signers: [escrowAccount],
      });

      const account = await program.account.escrowAccount.fetch(escrowAccount.publicKey);
      console.log('account: ', account);
      console.log('account.seller: ', account.seller.toBase58());
      console.log('account.amount: ', account.amount);
      console.log('account.tokenAccountPubkey: ', account.tokenAccountPubkey.toBase58());

      console.log("List Success!");
      
    } catch (err) {
      console.log("Transaction error: ", err);
    }
  }

  async function buy() {
    const provider = await getProvider();

    // let buyer = new PublicKey("Aqx4vWvXuC9GDJhxdCLrfTFqEmSspFaDfSQrn9HGExeT");
    const program = new Program(idl, programID, provider);

    // Get the PDA that is assigned authority to token account.
    const [_pda, _nonce] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow")), escrowAccount.publicKey.toBuffer()],
      program.programId
    );

    const pda = _pda;

    console.log('pda_token_account: ', _pda.toBase58());

    await program.rpc.buy({
      accounts: {
        buyer: buyer.publicKey,
        pdaDepositTokenAccount: initializerTokenAccount,
        initializerMainAccount: provider.wallet.publicKey,
        escrowAccount: escrowAccount.publicKey,
        pdaAccount: pda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId
      },
      signers:[buyer]
    });

    console.log("buy success!");
  }

  async function cancel() {
    const provider = await getProvider();

    const program = new Program(idl, programID, provider);

    // // Get the PDA that is assigned authority to token account.
    const [_pda, _nonce] = await PublicKey.findProgramAddress(
      [Buffer.from(anchor.utils.bytes.utf8.encode("escrow")), escrowAccount.publicKey.toBuffer()],
      program.programId
    );

    const pda = _pda;

    console.log('user: ', buyer.publicKey.toBase58());
    await program.rpc.cancel({
      accounts: {
        user: provider.wallet.publicKey,
        pdaTokenAccount: initializerTokenAccount,
        pdaAccount: pda,
        escrowAccount: escrowAccount.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    });

    console.log("Cancel Success!");
  }

  if (!wallet.connected) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop:'100px' }}>
        <WalletModalProvider>
            <WalletMultiButton />
        </WalletModalProvider>
      </div>
    )
  } else {
    return (
      <div className="App">
        <Button onClick={CreateNFT}>CreateNFT</Button>
        <Button onClick = {initialize}>Initialize</Button>
        <Button onClick = {buy}>Buy</Button>
        <Button onClick = {cancel}>Cancel</Button>
      </div>
    );
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