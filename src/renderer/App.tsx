import '@fontsource/roboto/300.css';
import {
	Box, CssBaseline,
	Divider,
	ThemeProvider
} from '@mui/material';
import { observer } from 'mobx-react';
import { SnackbarProvider } from 'notistack';
import { Route, MemoryRouter as Router, Routes } from 'react-router-dom';
import './AppStore';
import { AppStore, Log, Pages } from './AppStore';
import { ConfiguratorAutoApp } from './Configurator/ConfiguratorAutoApp';
import { ConfiguratorManuallyApp } from './Configurator/ConfiguratorManuallyApp';
import { HeaderApp } from './HeaderApp';
import { LineBottomApp } from './LineBottomApp';
import { DragAndDropApp } from './Main/Components/DragAndDropApp';
import { ToolsApp } from './Main/Components/LineTools/ToolsApp';
import { ViewChangeApp } from './Main/Components/ViewChange/ViewChangeApp';
import { ConsoleApp } from './Main/Console/ConsoleApp';
import { SceneApp } from './Main/Scene/SceneApp';
import { AnimationFade, AnimationGrow } from './Shared/Styled/Animation';
import { FlexBoxColumn, FlexBoxRow } from './Shared/Styled/FlexBox';
import { Sizes } from './Shared/Styled/Sizes';
import { UpdateScheme, colors, darkTheme } from './Shared/Theme';

UpdateScheme();

const Main = observer(() => {
	return <FlexBoxColumn sx={{ opacity: AppStore.instance.ready ? '1' : '0' }}>
		<SnackbarProvider maxSnack={3}>
			<ThemeProvider theme={darkTheme}>
				<CssBaseline enableColorScheme />
				<HeaderApp />
				<Divider color={colors.background.dark}/>
				<AnimationFade in={AppStore.getState() === Pages.Main} unmount={false}>
					<FlexBoxRow>
						<FlexBoxColumn>
							<FlexBoxRow>
								<FlexBoxRow>
									<ToolsApp/>
									<ViewChangeApp/>
									<SceneApp />
								</FlexBoxRow>
							</FlexBoxRow>
							<LineBottomApp/>
						</FlexBoxColumn>
						<ConsoleApp />
						<DragAndDropApp open={AppStore.instance.dropFile} />
					</FlexBoxRow>
				</AnimationFade>
				<AnimationGrow in={AppStore.getState() === Pages.Configurator}>
					<FlexBoxColumn>
						<ConfiguratorAutoApp/>
						<ConsoleApp mb={Sizes.twelve}/>
					</FlexBoxColumn>
				</AnimationGrow>
				<AnimationGrow in={AppStore.getState() === Pages.ConfiguratorManually}>
					<FlexBoxColumn>
						<ConfiguratorManuallyApp/>
					</FlexBoxColumn>
				</AnimationGrow>
			</ThemeProvider>
		</SnackbarProvider>
	</FlexBoxColumn>;
});

export const App = () => <Router>
	<Routes>
		<Route path="/" element={<Main />} />
	</Routes>
</Router>;

Log('Application started');

