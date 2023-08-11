'use client'
import { CHAIN_NAMESPACES, SafeEventEmitterProvider } from "@web3auth/base";
import { Web3Auth } from "@web3auth/modal";
import {
  getAddress,
  JsonRpcProvider,
  parseEther,
  toQuantity,
  Wallet,
  Contract,
  formatEther
} from "ethers";
import { useEffect, useState } from "react";
import { Client, Presets } from "userop";

export default function Home() {
  const [web3auth, setWeb3auth] = useState<Web3Auth | null>(null);
  const [account, setAccount] = useState<Presets.Builder.Kernel | null>(
    null
  );
  const [idToken, setIdToken] = useState<string | null>(null);
  const [haveStamp, setStamp] = useState<string | null>("0");
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [events, setEvents] = useState<string[]>([
    `A sample application to demonstrate how to integrate self-custodial\nsocial login and transacting with Web3Auth and userop.js.`,
  ]);
  const [loading, setLoading] = useState(false);

  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  const pmUrl = process.env.NEXT_PUBLIC_PAYMASTER_URL;
  const web3AuthClientId = process.env.NEXT_PUBLIC_WEB3_AUTH_CLIENT_ID;
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const abi = require("../components/abi.json");

  if (!web3AuthClientId) {
    throw new Error("WEB3AUTH_CLIENT_ID is undefined");
  }

  if (!rpcUrl) {
    throw new Error("RPC_URL is undefined");
  }

  if (!pmUrl) {
    throw new Error("PAYMASTER_RPC_URL is undefined");
  }

  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS is undefined");
  }

  if (!abi) {
    throw new Error("ABI is undefined");
  }

  const pmContext = {
    type: "payg",
  };

  const paymasterMiddleware = true 
  ? Presets.Middleware.verifyingPaymaster(
    pmUrl,
    pmContext
  )
  : undefined;

  const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
  
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const provider = new JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
        const network = await provider.getNetwork();
        const chainId = network.chainId;
        const web3auth = new Web3Auth({
          clientId: web3AuthClientId,
          web3AuthNetwork: "testnet",
          chainConfig: {
            chainNamespace: CHAIN_NAMESPACES.EIP155,
            chainId: toQuantity(chainId),
            rpcTarget: process.env.NEXT_PUBLIC_RPC_URL,
          },
        });

        await web3auth.initModal();

        setWeb3auth(web3auth);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const checkNFT = async () => {
    if (!account) {
      throw new Error("Account not initialized");
    }

    const contract = new Contract(contractAddress, abi, provider);

    const stamp = await contract.balanceOf(account?.getSender());
    console.log(stamp.toString())
    setStamp(stamp.toString())
  }

  const createAccount = async (privateKey: string) => {
    return await Presets.Builder.Kernel.init(
      new Wallet(privateKey) as any,
      rpcUrl,
      { paymasterMiddleware }
    );
  };

  const getPrivateKey = async (provider: SafeEventEmitterProvider) => {
    return (await provider.request({
      method: "private_key",
    })) as string;
  };

  const setAuthorized = async (w3auth: Web3Auth) => {
    if (!w3auth.provider) {
      throw new Error("web3authprovider not initialized yet");
    }
    const authenticateUser = await w3auth.authenticateUser();

    const privateKey = await getPrivateKey(w3auth.provider);
    const acc = await createAccount(privateKey);
    setIdToken(authenticateUser.idToken);
    setAccount(acc);
    setPrivateKey(privateKey);
  };

  const login = async () => {
    if (!web3auth) {
      throw new Error("web3auth not initialized yet");
    }
    const web3authProvider = await web3auth.connect();
    if (!web3authProvider) {
      throw new Error("web3authprovider not initialized yet");
    }

    setAuthorized(web3auth);
  };

  const logout = async () => {
    if (!web3auth) {
      throw new Error("web3auth not initialized yet");
    }
    await web3auth.logout();
    setAccount(null);
    setIdToken(null);
    setPrivateKey(null);
  };

  const addEvent = (newEvent: string) => {
    setEvents((prevEvents) => [...prevEvents, newEvent]);
  };

  const sendTransaction = async () => {
    setEvents([]);
    if (!account) {
      throw new Error("Account not initialized");
    }
    addEvent("Sending transaction...");

    const client = await Client.init(rpcUrl);

    const value = parseEther("0");
    
    const contract = new Contract(contractAddress, abi, provider);

    const op = {
      to: contractAddress,
      value: value,
      data: contract.interface.encodeFunctionData("safeMint", [account.getSender()]),
    };
    const res = await client.sendUserOperation(
      account.execute(op),
      {
        onBuild: async (op: {}) => {
          addEvent(`Signed UserOperation: `);
          addEvent(JSON.stringify(op, null, 2) as any);
        },
      }
    );
    addEvent(`UserOpHash: ${res.userOpHash}`);

    addEvent("Waiting for transaction...");
    const ev = await res.wait();
    addEvent(`Transaction hash: ${ev?.transactionHash ?? null}`);
  };
  
  if(account){
    checkNFT();
  }

  if (loading) {
    return <p>loading...</p>;
  }

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-between p-24`}
    >
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <div></div>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          {idToken ? (
          <div>
            <div className="flex flex-col items-center pt-8">
              <button
                type="button"
                onClick={logout}
                className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Logout
              </button>
            </div>
            {haveStamp !== "0" ? (
              <div className="col-start-2 col-span-2 row-span-2 border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
                <div className="w-[100%]">
                  <div className="block whitespace-pre-wrap justify-center ">
                    <div>
                      <img src="https://ipfs.io/ipfs/QmWgFy2mk3u6nYpR4H26FLS2arK6cBVtJEd8556GPH5yCG"></img>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="w-[1000px] flex justify-center items-center h-screen">
                  <div className="block whitespace-pre-wrap">                    
                    <button
                      type="button"
                      onClick={sendTransaction}
                      className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      Get Stamp
                    </button>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        ) : (
          <button
            type="button"
            onClick={login}
            className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Login
          </button>
        )}
        </div>
      </div>
    </div>
  );
}
