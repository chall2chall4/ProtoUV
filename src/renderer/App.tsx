import './AppStore';
import '@fontsource/roboto/300.css';
import { Box, ThemeProvider } from '@mui/material';
import { Route, MemoryRouter as Router, Routes } from 'react-router-dom';
import { Log } from './AppStore';
import { Header } from './Header';
import { ConsoleApp } from './Main/Console/ConsoleApp';
import { TransformApp } from './Main/Transform/TransformApp';
import { UpdateScheme, colors, darkTheme } from './Shared/Colors';

UpdateScheme();

const Main = () => <ThemeProvider theme={darkTheme}>
	<Header />
	<Box sx={{
		width:'100%',
		height:'100%',
		backgroundColor: colors.background.heavy,
	}}>
	</Box>
	<ConsoleApp/>
	<TransformApp/>
</ThemeProvider>;

export const App = () => <Router>
	<Routes>
		<Route path="/" element={<Main />} />
	</Routes>
</Router>;

Log.Add('Application started');

