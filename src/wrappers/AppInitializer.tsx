import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { initializeNetworkConfig } from 'redux/slices/networkConfigSlice';
import { NetworkConfigType } from 'types';

export default function AppInitializer({
  networkConfig,
  children
}: {
  networkConfig: NetworkConfigType;
  children: any;
}) {
  const [initialized, setInitialized] = useState(false);
  const dispatch = useDispatch();

  async function initializeApp() {
    await dispatch(initializeNetworkConfig(networkConfig));
    setInitialized(true);
  }
  useEffect(() => {
    initializeApp();
  }, []);
  return initialized ? children : null;
}