import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { EditorPage } from "./pages/EditorPage";
import { SessionsPage } from "./pages/SessionsPage";
import { InputPage } from "./pages/InputPage";
import { MainPage } from "./pages/MainPage";
import { FaHome } from "react-icons/fa";

// Transition approach: 
// Phase 1: Add MainPage as primary route but keep others for backward compatibility
// Phase 2 (later): Remove other routes when fully migrated
const App = () => {
	return (
		<Router>
			<div className="min-h-screen flex flex-col">
				{/* Navigation */}
				<nav className="text-[#666666] bg-transparent py-8">
					<div className="container mx-auto relative">
						<div className="flex items-center justify-between">
							{/* Home icon on the left */}
							<Link to="https://www.moiz.one/" className="text-[#666666] hover:text-[#333333] transition-colors pl-4" title="Home">
								<FaHome className="text-3xl" />
							</Link>

							{/* Logo in the center */}
							<div className="absolute left-1/2 transform -translate-x-1/2">
								<Link to="/" className="hover:text-[#333333] transition-colors">
									<img
										src="/Pensieve.png"
										alt="Logo"
										className="h-[3rem] w-auto opacity-100"
									/>
								</Link>
							</div>

							{/* Empty div for balanced layout */}
							<div className="w-12"></div>
						</div>
					</div>
				</nav>

				{/* Routes */}
				<div className="flex-grow">
					<Routes>
						{/* Main new route */}
						<Route path="/" element={<MainPage />} />
						
						{/* Legacy routes - kept for backward compatibility during transition */}
						<Route path="/sessions" element={<SessionsPage />} />
						<Route path="/input/:id" element={<InputPage />} />
						<Route
							path="/analysis/:id"
							element={<EditorPage mode="analysis" />}
						/>
					</Routes>
				</div>

				{/* Footer */}
				<footer className="text-sm text-[#666666] text-center py-4">
					Made by <a href="https://www.moiz.one" target="_blank" rel="noopener noreferrer" className="text-[#5CB85C] hover:text-[#4c9a4c] underline transition-colors">Moiz</a> and AI
				</footer>
			</div>
		</Router>
	);
};

export default App;
