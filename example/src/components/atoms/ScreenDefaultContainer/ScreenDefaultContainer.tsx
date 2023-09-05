import React from 'react';
import { Container } from './ScreenDefaultContainer.styled';
export type ScreenDefaultContainerProps = {
   children: React.ReactNode;
};

export const ScreenDefaultContainer = ({
   children,
}: ScreenDefaultContainerProps) => {
   return <Container>{children}</Container>;
};
