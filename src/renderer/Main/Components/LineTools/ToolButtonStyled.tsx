import { Tooltip } from '@mui/material';
import { observer } from 'mobx-react';
import React from 'react';
import { FlexBoxColumnFit, flexChildrenCenter } from '../../../Shared/Styled/FlexBox';
import { Sizes } from '../../../Shared/Styled/Sizes';
import { colors } from '../../../Shared/Theme';

export const ToolButtonStyled = observer((props: {
  children: React.ReactElement;
  onClick: (arg: React.MouseEvent<HTMLElement>) => void;
  description: string;
  selected: boolean;
  clickColor?: string;
  hoverColor?: string;
  mini?: boolean;
}) => {
	const size = Sizes.multiply(Sizes.eight, 4);

	return <Tooltip title={props.description} arrow placement="right">
		<FlexBoxColumnFit onClick={props.onClick} sx={{
			...flexChildrenCenter,
			width: props.mini ? Sizes.sum(size, Sizes.sixteen) : Sizes.sum(size, size),
			height: size,
			backgroundColor: props.selected ? colors.interact.neutral : colors.background.dark,
			transition: 'all 0.3s',
			color: props.selected ? colors.background.white : colors.background.light,
			'&:hover': {
				backgroundColor: props.hoverColor ?? colors.interact.neutral
			},
			'&:active': {
				backgroundColor: props.clickColor ?? colors.interact.touch,
				transform: 'translateY(-1px)'
			}
		}}>
			{props.children}
		</FlexBoxColumnFit>
	</Tooltip>;
});
