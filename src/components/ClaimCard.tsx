import { useState } from "react";
import type { HighlightWithText } from "../services/models/types";

interface ClaimCardProps {
	claim: HighlightWithText;
	evidence: HighlightWithText[];
	onEdit: (id: string, text: string) => void;
	onDelete: (id: string, type: "claim" | "evidence") => void;
	onAddEvidence: (claimId: string, text: string) => void;
}

export const ClaimCard = ({
	claim,
	evidence,
	onEdit,
	onDelete,
	onAddEvidence,
}: ClaimCardProps) => {
	const [isEditingClaim, setIsEditingClaim] = useState(false);
	const [isEditingEvidence, setIsEditingEvidence] = useState<string | null>(
		null
	);
	const [isAddingEvidence, setIsAddingEvidence] = useState(false);
	const [editText, setEditText] = useState("");
	const [newEvidenceText, setNewEvidenceText] = useState("");

	const handleStartEditClaim = () => {
		setIsEditingClaim(true);
		setEditText(claim.text);
	};

	const handleStartEditEvidence = (evidence: HighlightWithText) => {
		setIsEditingEvidence(evidence.id);
		setEditText(evidence.text);
	};

	const handleSaveEdit = (id: string) => {
		if (!editText.trim()) return;
		onEdit(id, editText.trim());
		setIsEditingClaim(false);
		setIsEditingEvidence(null);
		setEditText("");
	};

	const handleAddEvidence = () => {
		if (!newEvidenceText.trim()) return;
		onAddEvidence(claim.id, newEvidenceText);
		setIsAddingEvidence(false);
		setNewEvidenceText("");
	};

	return (
		<div className="bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:border-gray-300 hover:shadow-sm group relative">
			<div className="flex justify-between items-start mb-4">
				<div className="flex-1">
					{isEditingClaim ? (
						<div className="space-y-2">
							<textarea
								className="w-full border border-gray-200 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
								rows={3}
								value={editText}
								onChange={(e) => setEditText(e.target.value)}
								autoFocus
							/>
							<div className="flex gap-2">
								<button
									onClick={() => handleSaveEdit(claim.id)}
									className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm transition-colors duration-200 flex items-center gap-1.5"
								>
									<svg
										className="w-4 h-4"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M20 6L9 17l-5-5" />
									</svg>
									Save
								</button>
								<button
									onClick={() => {
										setIsEditingClaim(false);
										setEditText("");
									}}
									className="px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 text-sm transition-colors duration-200 flex items-center gap-1.5"
								>
									<svg
										className="w-4 h-4"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M6 18L18 6M6 6l12 12" />
									</svg>
									Cancel
								</button>
							</div>
						</div>
					) : (
						<>
							<p className="text-lg mb-2 font-normal">{claim.text}</p>
							<div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
								<button
									onClick={() => setIsAddingEvidence(true)}
									className="p-1.5 text-gray-500 hover:text-blue-500 rounded-md hover:bg-blue-50 transition-all duration-200 group/btn relative"
									title="Add evidence"
								>
									<svg
										className="w-4 h-4"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M12 5v14M5 12h14" />
									</svg>
									<span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 whitespace-nowrap font-sans">
										Add evidence
									</span>
								</button>
								<button
									onClick={handleStartEditClaim}
									className="p-1.5 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-all duration-200 group/btn relative"
									title="Edit claim"
								>
									<svg
										className="w-4 h-4"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
										<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
									</svg>
									<span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 whitespace-nowrap font-sans">
										Edit claim
									</span>
								</button>
								<button
									onClick={() => onDelete(claim.id, "claim")}
									className="p-1.5 text-gray-500 hover:text-red-500 rounded-md hover:bg-red-50 transition-all duration-200 group/btn relative"
									title="Delete claim"
								>
									<svg
										className="w-4 h-4"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
									>
										<path d="M3 6h18" />
										<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
										<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
									</svg>
									<span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 whitespace-nowrap font-sans">
										Delete claim
									</span>
								</button>
							</div>
						</>
					)}
				</div>
			</div>

			<div className="mt-4">
				{evidence.length > 0 && (
					<div className="flex justify-between items-center mb-2">
						<p className="text-sm font-sans font-medium text-gray-600">
							Evidence
						</p>
					</div>
				)}

				{isAddingEvidence && (
					<div className="mb-4 space-y-2">
						<textarea
							className="w-full border border-gray-200 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
							rows={2}
							placeholder="Enter your evidence here..."
							value={newEvidenceText}
							onChange={(e) => setNewEvidenceText(e.target.value)}
							autoFocus
						/>
						<div className="flex gap-2">
							<button
								onClick={handleAddEvidence}
								className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm transition-colors duration-200 flex items-center gap-1.5"
							>
								<svg
									className="w-4 h-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<path d="M12 5v14M5 12h14" />
								</svg>
								Add Evidence
							</button>
							<button
								onClick={() => {
									setIsAddingEvidence(false);
									setNewEvidenceText("");
								}}
								className="px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 text-sm transition-colors duration-200 flex items-center gap-1.5"
							>
								<svg
									className="w-4 h-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
								>
									<path d="M6 18L18 6M6 6l12 12" />
								</svg>
								Cancel
							</button>
						</div>
					</div>
				)}

				{evidence.length === 0 ? null : (
					<ul className="space-y-2">
						{evidence.map((item) => (
							<li
								key={item.id}
								className="bg-gray-50 p-3 rounded-md transition-all duration-200 hover:bg-gray-100"
							>
								{isEditingEvidence === item.id ? (
									<div className="space-y-2">
										<textarea
											className="w-full border border-gray-200 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
											rows={2}
											value={editText}
											onChange={(e) => setEditText(e.target.value)}
											autoFocus
										/>
										<div className="flex gap-2">
											<button
												onClick={() => handleSaveEdit(item.id)}
												className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm transition-colors duration-200 flex items-center gap-1.5"
											>
												<svg
													className="w-4 h-4"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
												>
													<path d="M20 6L9 17l-5-5" />
												</svg>
												Save
											</button>
											<button
												onClick={() => {
													setIsEditingEvidence(null);
													setEditText("");
												}}
												className="px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 text-sm transition-colors duration-200 flex items-center gap-1.5"
											>
												<svg
													className="w-4 h-4"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
												>
													<path d="M6 18L18 6M6 6l12 12" />
												</svg>
												Cancel
											</button>
										</div>
									</div>
								) : (
									<div className="flex justify-between items-start">
										<p className="text-sm text-gray-700">{item.text}</p>
										<div className="flex gap-1.5">
											<button
												onClick={() => handleStartEditEvidence(item)}
												className="p-1.5 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-all duration-200 group relative"
												title="Edit evidence"
											>
												<svg
													className="w-4 h-4"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
												>
													<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
													<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
												</svg>
												<span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 whitespace-nowrap font-sans">
													Edit evidence
												</span>
											</button>
											<button
												onClick={() => onDelete(item.id, "evidence")}
												className="p-1.5 text-gray-500 hover:text-red-500 rounded-md hover:bg-red-50 transition-all duration-200 group relative"
												title="Delete evidence"
											>
												<svg
													className="w-4 h-4"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
												>
													<path d="M3 6h18" />
													<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
													<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
												</svg>
												<span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 whitespace-nowrap font-sans">
													Delete evidence
												</span>
											</button>
										</div>
									</div>
								)}
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
};
