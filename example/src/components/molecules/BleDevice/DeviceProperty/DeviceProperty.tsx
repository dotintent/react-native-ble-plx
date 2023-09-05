import React from 'react';
import {
   Container,
   StyledTitleText,
   StyledValueText,
} from './DeviceProperty.styled';
export type DevicePropertyProps = {
   name: string;
   value?: number | string | null;
};

export const DeviceProperty = ({ name, value }: DevicePropertyProps) => {
   return (
      <Container>
         <StyledTitleText>{name}:</StyledTitleText>
         <StyledValueText>{value || '-'}</StyledValueText>
      </Container>
   );
};
