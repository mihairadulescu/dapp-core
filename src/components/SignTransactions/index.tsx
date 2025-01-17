import React, { useEffect, useState } from 'react';
import { Address, Nonce } from '@elrondnetwork/erdjs';
import { useDispatch, useSelector } from 'redux/DappProviderContext';
import {
  addressSelector,
  providerSelector,
  proxySelector
} from 'redux/selectors';
import { transactionsToSignSelector } from 'redux/selectors/transactionsSelectors';
import {
  clearSignTransactions,
  updateSignedTransaction
} from 'redux/slices/transactionsSlice';
import { LoginMethodsEnum, TransactionBatchStatusesEnum } from 'types/enums';
import { getLatestNonce } from 'utils';
import { replyUrl, useParseSignedTransactions } from './helpers';
import { walletSignSession } from './helpers/constants';

import getProviderType from './helpers/getProviderType';
import SignWithExtensionModal from './SignWithExtensionModal';
import SignWithLedgerModal from './SignWithLedgerModal';
import SignWithWalletConnectModal from './SignWithWalletConnectModal';

export default function SignTransactions({
  className
}: {
  className?: string;
}) {
  const [showSignModal, setShowSignModal] = useState<boolean>(false);
  const [newCallbackRoute, setNewCallbackRoute] = useState<string>('');
  const [newSessionId, setNewSessionId] = useState<string>('');
  const [error, setError] = useState<string>('');

  const provider = useSelector(providerSelector);
  const proxy = useSelector(proxySelector);
  const address = useSelector(addressSelector);
  const transactionsToSign = useSelector(transactionsToSignSelector);
  const dispatch = useDispatch();

  useParseSignedTransactions();

  const providerType = getProviderType(provider);

  const handleClose = () => {
    setNewCallbackRoute('');
    setError('');
    setShowSignModal(false);
    dispatch(clearSignTransactions());
  };
  const showError = (e: string) => {
    setShowSignModal(true);
    setError(e);
  };

  const signTransactions = async () => {
    if (transactionsToSign) {
      const { sessionId, transactions, callbackRoute } = transactionsToSign;
      try {
        setNewCallbackRoute(callbackRoute);
        setNewSessionId(sessionId);
        if (provider == null) {
          setShowSignModal(true);
          setError(
            'You need a signer/valid signer to send a transaction, use either WalletProvider, LedgerProvider or WalletConnect'
          );
          return;
        }

        const proxyAccount = await proxy.getAccount(new Address(address));
        const latestNonce = getLatestNonce(proxyAccount);

        transactions.forEach((tx, i) => {
          tx.setNonce(new Nonce(latestNonce + i));
        });

        switch (providerType) {
          case LoginMethodsEnum.wallet:
            const callbackUrl = replyUrl({
              callbackUrl: `${window.location.origin}${callbackRoute}`,
              urlParams: { [walletSignSession]: sessionId }
            });

            // TODO: eslint warning
            provider.signTransactions(transactions, {
              callbackUrl: encodeURIComponent(callbackUrl)
            });

            break;
          case LoginMethodsEnum.extension:
          case LoginMethodsEnum.ledger:
          case LoginMethodsEnum.walletconnect:
            setShowSignModal(true);
            break;
        }
      } catch (err) {
        console.error('error when signing', err);
        dispatch(
          updateSignedTransaction({
            [sessionId]: {
              status: TransactionBatchStatusesEnum.cancelled
            }
          })
        );
        // TODO: if axios error then maybe use err.message ?
        showError(err as any);
      }
    }
  };

  const signProps = {
    handleClose,
    error,
    setError,
    sessionId: newSessionId,
    providerType,
    callbackRoute: newCallbackRoute,
    className
  };

  useEffect(() => {
    if (transactionsToSign?.sessionId) {
      signTransactions();
    }
  }, [transactionsToSign?.sessionId]);
  return showSignModal && transactionsToSign?.transactions != null ? (
    <React.Fragment>
      {providerType === LoginMethodsEnum.ledger && (
        <SignWithLedgerModal {...signProps} />
      )}
      {providerType === LoginMethodsEnum.walletconnect && (
        <SignWithWalletConnectModal {...signProps} />
      )}
      {providerType === LoginMethodsEnum.extension && (
        <SignWithExtensionModal {...signProps} />
      )}
    </React.Fragment>
  ) : null;
}
