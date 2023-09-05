import React from 'react';
import { TouchableOpacityProps } from 'react-native';
import { Container, StyledText } from './Button.styled';
export type AppButtonProps = TouchableOpacityProps & {
   label: string;
};

export const AppButton = ({ label, ...props }: AppButtonProps) => {
   return (
      <Container {...props}>
         <StyledText>{label}</StyledText>
      </Container>
   );
};
