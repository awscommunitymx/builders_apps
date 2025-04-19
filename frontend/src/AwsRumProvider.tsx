import React, { createContext, useContext, ReactNode } from 'react';
import { AwsRum, AwsRumConfig } from 'aws-rum-web';

const guestRoleArn = import.meta.env.VITE_GUEST_ROLE_ARN;
const identityPoolId = import.meta.env.VITE_IDENTITY_POOL_ID;
const applicationId = import.meta.env.VITE_RUM_APP_MONITOR_ID || '';
const region = import.meta.env.VITE_RUM_APP_REGION || 'us-west-1';
const endpoint = `https://dataplane.rum.${region}.amazonaws.com`;
const version = '1.0.0';

// Define the context type
export type AwsRumContextType = AwsRum | null;

// Create the context
const AwsRumContext = createContext<AwsRumContextType>(null);

interface AwsRumProviderProps {
  children: ReactNode;
}

export const AwsRumProvider: React.FC<AwsRumProviderProps> = ({ children }) => {
  let awsRum: AwsRum | null = null;

  try {
    const config: AwsRumConfig = {
      sessionSampleRate: 1,
      guestRoleArn,
      identityPoolId,
      endpoint,
      telemetries: ['performance', 'errors', 'http'],
      allowCookies: true,
      enableXRay: false,
    };

    awsRum = new AwsRum(applicationId, version, region, config);
  } catch (error) {
    console.error('AWS RUM initialization error:', error);
  }

  return <AwsRumContext.Provider value={awsRum}>{children}</AwsRumContext.Provider>;
};

// Hook to access the AwsRum context
export const useAwsRum = (): AwsRumContextType => {
  return useContext(AwsRumContext);
};
