import React from 'react';
import { HWProvider } from '@elrondnetwork/erdjs';
import { useDispatch, useSelector } from 'react-redux';
import { loginAction } from 'redux/commonActions';
import {
  isLoggedInSelector,
  ledgerAccountSelector,
  proxySelector
} from 'redux/selectors';
import {
  setLedgerAccount,
  setLedgerLogin,
  setProvider,
  setTokenLogin
} from 'redux/slices';
import { ledgerErrorCodes } from '../../constants';
import { loginMethodsEnum } from '../../types/enums';
import { LoginHookGenericStateType, LoginHookTriggerType } from '../types';

const ledgerAppErrorText = 'Check if Elrond app is open on Ledger';
const failedInitializeErrorText =
  'Could not initialise ledger app, make sure Elrond app is open';

const defaultAddressesPerPage = 10;

export interface UseLedgerLoginPropsType {
  callbackRoute: string;
  addressesPerPage?: number;
  token?: string;
}

export interface SelectedAddress {
  address: string;
  index: number;
}

export interface LedgerLoginHookCustomStateType {
  accounts: string[];
  showAddressList: boolean;
  startIndex: number;
  selectedAddress: SelectedAddress | null;

  onGoToPrevPage: () => void;
  onGoToNextPage: () => void;
  onSelectAddress: (address: SelectedAddress | null) => void;
  onConfirmSelectedAddress: () => void;
}

export type LedgerLoginHookReturnType = [
  LoginHookTriggerType,
  LoginHookGenericStateType,
  LedgerLoginHookCustomStateType
];

export function useLedgerLogin({
  callbackRoute,
  addressesPerPage = defaultAddressesPerPage,
  token
}: UseLedgerLoginPropsType): LedgerLoginHookReturnType {
  const ledgerAccount = useSelector(ledgerAccountSelector);
  const isLoggedIn = useSelector(isLoggedInSelector);
  const proxy = useSelector(proxySelector);
  const dispatch = useDispatch();
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const hwWalletP = new HWProvider(proxy);

  const [startIndex, setStartIndex] = React.useState(0);
  const [accounts, setAccounts] = React.useState<string[]>([]);
  const [selectedAddress, setSelectedAddress] =
    React.useState<SelectedAddress | null>(null);

  const [showAddressList, setShowAddressList] = React.useState(false);

  function dispatchLoginActions({
    provider,
    address,
    index,
    signature
  }: {
    provider: HWProvider;
    address: string;
    index: number;
    signature?: string;
  }) {
    dispatch(setProvider(provider));

    dispatch(setLedgerLogin({ index, loginType: loginMethodsEnum.ledger }));

    if (signature) {
      dispatch(
        setTokenLogin({
          loginToken: String(token),
          signature
        })
      );
    }
    dispatch(loginAction({ address, loginMethod: loginMethodsEnum.ledger }));
    window.location.href = callbackRoute;
  }

  const loginFailed = (err: any, customMessage?: string) => {
    if (err.statusCode in ledgerErrorCodes) {
      setError(
        (ledgerErrorCodes as any)[err.statusCode].message + customMessage
      );
      dispatch(setLedgerAccount(null));
    }
    setIsLoading(false);
    console.warn(err);
  };

  async function loginUser(hwWalletProvider: HWProvider) {
    if (selectedAddress == null) {
      return false;
    }
    const { index } = selectedAddress;

    if (token) {
      try {
        const loginInfo = await hwWalletProvider.tokenLogin({
          token: Buffer.from(`${token}{}`),
          addressIndex: index
        });
        dispatchLoginActions({
          address: loginInfo.address,
          provider: hwWalletProvider,
          index: index,
          signature: loginInfo.signature.hex()
        });
      } catch (err) {
        loginFailed(err, '. Update Elrond App to continue.');
      }
    } else {
      try {
        const address = await hwWalletProvider.login({ addressIndex: index });
        dispatchLoginActions({
          address,
          provider: hwWalletProvider,
          index
        });
      } catch (err) {
        loginFailed(err);
        return false;
      }
    }
    return true;
  }

  async function onConfirmSelectedAddress() {
    try {
      setIsLoading(true);
      if (selectedAddress == null) {
        return false;
      }
      const { address, index } = selectedAddress;
      dispatch(
        setLedgerAccount({
          index,
          address
        })
      );
      const hwWalletProvider = new HWProvider(proxy);
      const initialized = await hwWalletProvider.init();
      if (!initialized) {
        setError(failedInitializeErrorText);
        console.warn(failedInitializeErrorText);
        return false;
      }
      setIsLoading(false);
      await loginUser(hwWalletProvider);
    } catch (err) {
      if (err.statusCode in ledgerErrorCodes) {
        setError((ledgerErrorCodes as any)[err.statusCode].message);
      }
      console.warn(failedInitializeErrorText, err);
    } finally {
      setIsLoading(false);
    }
    setShowAddressList(false);
    return true;
  }

  async function fetchAccounts() {
    try {
      setIsLoading(true);
      const initialized = await hwWalletP.init();
      if (!initialized) {
        setError(failedInitializeErrorText);
        console.warn(failedInitializeErrorText);
        return;
      }
      const accounts = await hwWalletP.getAccounts(
        startIndex,
        addressesPerPage
      );
      setAccounts(accounts);
    } catch (err) {
      if (err.statusCode in ledgerErrorCodes) {
        setError((ledgerErrorCodes as any)[err.statusCode].message);
      } else {
        setError(ledgerAppErrorText);
      }
      console.error('error', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function onStartLogin() {
    setError('');
    try {
      setIsLoading(true);
      if (ledgerAccount != null) {
        const hwWalletP = new HWProvider(proxy);
        const initialized = await hwWalletP.init();
        if (!initialized) {
          console.warn(failedInitializeErrorText);
          return;
        }
        const address = await hwWalletP.login();
        dispatch(setProvider(hwWalletP));
        dispatch(
          loginAction({ address, loginMethod: loginMethodsEnum.ledger })
        );
        window.location.href = callbackRoute;
      } else {
        setShowAddressList(true);
      }
    } catch (error) {
      console.error('error ', error);
      setError(ledgerAppErrorText);
    } finally {
      setIsLoading(false);
    }
  }

  function onSelectAddress(newSelectedAddress: SelectedAddress | null) {
    setSelectedAddress(newSelectedAddress);
  }

  function onGoToNextPage() {
    setSelectedAddress(null);
    setStartIndex((current) => current + 1);
  }

  function onGoToPrevPage() {
    setSelectedAddress(null);
    setStartIndex((current) => (current === 0 ? 0 : current - 1));
  }

  React.useEffect(() => {
    fetchAccounts();
  }, [startIndex]);
  return [
    onStartLogin,
    {
      isLoggedIn,
      error,
      isLoading
    },
    {
      accounts,
      showAddressList,
      startIndex,
      selectedAddress,

      onGoToPrevPage,
      onGoToNextPage,
      onSelectAddress,
      onConfirmSelectedAddress
    }
  ];
}