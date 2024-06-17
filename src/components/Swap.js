import React, { useState, useEffect } from "react";
import { Input, Popover, Radio, Modal, message } from "antd";
import {
  ArrowDownOutlined,
  DownOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import tokenList from "../tokenList.json";
import axios from "axios";
import { useSendTransaction, useWaitForTransaction } from "wagmi";

function Swap(props) {
  const { address, isConnected } = props;
  const [messageApi, contextHolder] = message.useMessage();
  const [slippage, setSlippage] = useState(2.5);
  const [tokenOneAmount, setTokenOneAmount] = useState(null);
  const [tokenTwoAmount, setTokenTwoAmount] = useState(null);
  const [tokenOne, setTokenOne] = useState(tokenList[0]);
  const [tokenTwo, setTokenTwo] = useState(tokenList[1]);
  const [isOpen, setIsOpen] = useState(false);
  const [changeToken, setChangeToken] = useState(1);
  const [prices, setPrices] = useState(null);
  const [txDetails, setTxDetails] = useState({
    to: null,
    data: null,
    value: null,
  });
  const [addressOne, setAddressOne] = useState(tokenList[0].address);
  const [addressTwo, setAddressTwo] = useState(tokenList[1].address);
  const [decimalsOne, setDecimalsOne] = useState(tokenList[0].decimals);
  const [decimalsTwo, setDecimalsTwo] = useState(tokenList[1].decimals);
  const [show, setShow] = useState(false);
  const [price1, setPrice1] = useState();
  const [price2, setPrice2] = useState();
  const { data, sendTransaction } = useSendTransaction({
    request: {
      from: address,
      to: String(txDetails.to),
      data: String(txDetails.data),
      value: String(txDetails.value),
    },
  });

  const { isLoading, isSuccess } = useWaitForTransaction({
    hash: data?.hash,
  });

  function handleSlippageChange(e) {
    setSlippage(e.target.value);
  }

  function changeAmount(e) {
    setTokenOneAmount(e.target.value);
    if (e.target.value && prices) {
      setTokenTwoAmount((e.target.value * prices.ratio).toFixed(2));
    } else {
      setTokenTwoAmount(null);
    }
  }

  function switchTokens() {
    setPrices(null);
    setTokenOneAmount(null);
    setTokenTwoAmount(null);
    const one = tokenOne;
    const two = tokenTwo;
    setTokenOne(two);
    setTokenTwo(one);
    setAddressOne(two.address);
    setAddressTwo(one.address);
    setDecimalsOne(two.decimals);
    setDecimalsTwo(one.decimals);
    fetchPrices(two.address, one.address);
  }

  function openModal(asset) {
    setChangeToken(asset);
    setIsOpen(true);
  }

  function modifyToken(i) {
    setPrices(null);
    setTokenOneAmount(null);
    setTokenTwoAmount(null);
    if (changeToken === 1) {
      setTokenOne(tokenList[i]);
      setAddressOne(tokenList[i].address);
      setDecimalsOne(tokenList[i].decimals);
      fetchPrices(tokenList[i].address, tokenTwo.address);
    } else {
      setTokenTwo(tokenList[i]);
      setAddressTwo(tokenList[i].address);
      setDecimalsTwo(tokenList[i].decimals);
      fetchPrices(tokenOne.address, tokenList[i].address);
    }
    setIsOpen(false);
  }

  async function fetchPrices(one, two) {
    const res = await axios.get(`http://localhost:7777/demo`, {
      params: { addressOne: one, addressTwo: two },
    });

    setPrices(res.data);
  }

  async function fetchDexSwap() {
    try {
      const allowanceResponse = await httpCall();

      if (allowanceResponse.data.allowance === "0") {
        const approveResponse = await axios.get(
          `https://api.1inch.io/v5.0/1/approve/transaction?tokenAddress=${addressOne}`
        );

        setTxDetails(approveResponse.data);
        console.log("Approval transaction set:", approveResponse.data);
        return;
      }

      const swapResponse = await axios.get(
        `https://api.1inch.io/v5.0/1/swap?fromTokenAddress=${addressOne}&toTokenAddress=${addressTwo}&amount=${tokenOneAmount.padEnd(
          decimalsOne + tokenOneAmount.length,
          "0"
        )}&fromAddress=${address}&slippage=${slippage}`
      );

      let decimals = Number(`1E${decimalsTwo}`);
      setTokenTwoAmount(
        (Number(swapResponse.data.toTokenAmount) / decimals).toFixed(2)
      );

      setTxDetails(swapResponse.data.tx);
      console.log("Swap transaction set:", swapResponse.data.tx);
    } catch (error) {
      console.error("Error in fetchDexSwap:", error);
    }
  }

  async function httpCall() {
    const url = "https://api.1inch.dev/swap/v6.0/1/approve/allowance";

    const config = {
      headers: {
        Authorization: "Bearer X4pLMnM3qedwkBAhGptVUoFZQskqjouA",
      },
      params: {
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        walletAddress: "0xB41bC676cF9b330Ec49aAD026D9b42C8D76bA95B",
      },
    };

    try {
      const response = await axios.get(url, config);
      return response;
    } catch (error) {
      if (error.response.status === 401) {
        console.error(
          "Unauthorized - Check your API key or authentication credentials"
        );
      } else {
        console.error("Error:", error.message);
      }
      throw error;
    }
  }

  useEffect(() => {
    fetchPrices(tokenList[0].address, tokenList[1].address);
  }, []);

  useEffect(() => {
    if (txDetails.to && isConnected) {
      sendTransaction();
    }
  }, [txDetails]);

  useEffect(() => {
    messageApi.destroy();

    if (isLoading) {
      messageApi.open({
        type: "loading",
        content: "Transaction is Pending...",
        duration: 0,
      });
    }
  }, [isLoading]);

  useEffect(() => {
    messageApi.destroy();
    if (isSuccess) {
      messageApi.open({
        type: "success",
        content: "Transaction Successful",
        duration: 1.5,
      });
    } else if (txDetails.to) {
      messageApi.open({
        type: "error",
        content: "Transaction Failed",
        duration: 1.5,
      });
    }
  }, [isSuccess]);

  const settings = (
    <>
      <div>Slippage Tolerance</div>
      <div>
        <Radio.Group value={slippage} onChange={handleSlippageChange}>
          <Radio.Button value={0.5}>0.5%</Radio.Button>
          <Radio.Button value={2.5}>2.5%</Radio.Button>
          <Radio.Button value={5}>5.0%</Radio.Button>
        </Radio.Group>
      </div>
    </>
  );

  // useEffect(() => {
  //   exchange1();
  //   exchange2();
  // }, [price1, price2]);

  function exchange1() {
    axios
      .get(`http://localhost:7777/demo?address=${addressOne}`)
      .then(function (response) {
        console.log(response.data.response.usdPrice);
        setPrice1(response.data.response.usdPrice);
      })
      .catch(function (error) {
        console.error(error);
      });
  }
  function exchange2() {
    axios
      .get(`http://localhost:7777/demo?address=${addressTwo}`)
      .then(function (response) {
        console.log(response.data.response.usdPrice);
        setPrice2(response.data.response.usdPrice);
      })
      .catch(function (error) {
        console.error(error);
      });
  }
  console.log("phdfdbfhb :", prices);
  return (
    <>
      {contextHolder}
      <Modal
        open={isOpen}
        footer={null}
        onCancel={() => setIsOpen(false)}
        title="Select a token"
      >
        <div className="modalContent">
          {tokenList?.map((e, i) => {
            return (
              <div
                className="tokenChoice"
                key={i}
                onClick={() => modifyToken(i)}
              >
                <img src={e.img} alt={e.ticker} className="tokenLogo" />
                <div className="tokenChoiceNames">
                  <div className="tokenName">{e.name}</div>
                  <div className="tokenTicker">{e.ticker}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
      <div className="tradeBox">
        <div className="tradeBoxHeader">
          <h4>Swap</h4>
          <Popover
            content={settings}
            title="Settings"
            trigger="click"
            placement="bottomRight"
          >
            <SettingOutlined className="cog" />
          </Popover>
        </div>
        <div className="inputs">
          <div style={{ position: "relative" }}>
            <Input
              placeholder="0"
              value={tokenOneAmount}
              onInput={(e) => (changeAmount(e), exchange1(), exchange2())}
            />
            <div
              style={{
                position: "absolute",
                bottom: "10%",
                left: "3%",
                fontSize: "15px",
              }}
            >
              {price1 * tokenOneAmount}
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <Input
              placeholder="0"
              value={((price1 / price2) * tokenOneAmount).toFixed(3)}
              disabled={true}
            />
            <div
              style={{
                position: "absolute",
                bottom: "10%",
                left: "3%",
                fontSize: "15px",
              }}
            >
              {/* {Math.round(price2 - price1)} */}
              {price2 - price1}
              {/* {price1 - price2 } */}
            </div>
          </div>
          <div className="switchButton" onClick={switchTokens}>
            <ArrowDownOutlined className="switchArrow" />
          </div>
          <div className="assetOne" onClick={() => openModal(1)}>
            <img src={tokenOne.img} alt="assetOneLogo" className="assetLogo" />
            {tokenOne.ticker}
            <DownOutlined />
          </div>
          <div
            className="assetTwo"
            onClick={() => (openModal(2), setShow(true))}
          >
            {show ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0px",
                }}
              >
                <img
                  src={tokenTwo.img}
                  alt="assetOneLogo"
                  className="assetLogo"
                  style={{ margin: "5px" }}
                />
                {tokenTwo.ticker}
              </div>
            ) : (
              <div style={{ padding: "0px 0px 5px 10px" }}>select</div>
            )}
            <DownOutlined />
          </div>
        </div>
        <div
          className="swapButton"
          disabled={!tokenOneAmount || !isConnected}
          onClick={() => {
            console.log("Swap button clicked");
            fetchDexSwap();
          }}
        >
          Swap
        </div>
      </div>
    </>
  );
}

export default Swap;
