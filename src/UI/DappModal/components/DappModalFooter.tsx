import React from 'react';
import styles from '../styles/dapp-modal.scss';

type DappModalFooterProps = {
  visible?: boolean;
  footerClassName?: string;
  footerText?: string;
  customFooter?: JSX.Element;
};

const DappModalFooter: React.FC<DappModalFooterProps> = ({
  visible,
  customFooter,
  footerClassName,
  footerText
}) => {
  if (!visible) {
    return null;
  }

  return (
    <div className={`${styles.dappModalFooter} ${footerClassName}`}>
      {customFooter ?? <div>{footerText}</div>}
    </div>
  );
};

export default DappModalFooter;
