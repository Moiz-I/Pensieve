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
		<div className="bg-white rounded-lg shadow p-4">
			<div className="flex justify-between items-start mb-4">
				<div className="flex-1">
					{isEditingClaim ? (
						<div className="space-y-2">
							<textarea
								className="w-full border rounded-md p-2"
								rows={3}
								value={editText}
								onChange={(e) => setEditText(e.target.value)}
							/>
							<div className="flex gap-2">
								<button
									onClick={() => handleSaveEdit(claim.id)}
									className="px-3 py-1 bg-zinc-700 text-white rounded hover:bg-zinc-800 text-sm"
								>
									Save
								</button>
								<button
									onClick={() => {
										setIsEditingClaim(false);
										setEditText("");
									}}
									className="px-3 py-1 border rounded hover:bg-gray-50 text-sm"
								>
									Cancel
								</button>
							</div>
						</div>
					) : (
						<>
							<h3 className="text-lg font-medium mb-2">{claim.text}</h3>
							<div className="flex gap-2">
								<button
									onClick={handleStartEditClaim}
									className="text-sm text-blue-600 hover:text-blue-800"
								>
									Edit
								</button>
								<button
									onClick={() => onDelete(claim.id, "claim")}
									className="text-sm text-red-600 hover:text-red-800"
								>
									Delete
								</button>
							</div>
						</>
					)}
				</div>
			</div>

			<div className="mt-4">
				<div className="flex justify-between items-center mb-2">
					<h4 className="text-md font-medium">Supporting Evidence</h4>
					{!isAddingEvidence && (
						<button
							onClick={() => setIsAddingEvidence(true)}
							className="text-sm text-blue-600 hover:text-blue-800"
						>
							Add Evidence
						</button>
					)}
				</div>

				{isAddingEvidence && (
					<div className="mb-4 space-y-2">
						<textarea
							className="w-full border rounded-md p-2"
							rows={2}
							placeholder="Enter your evidence here..."
							value={newEvidenceText}
							onChange={(e) => setNewEvidenceText(e.target.value)}
						/>
						<div className="flex gap-2">
							<button
								onClick={handleAddEvidence}
								className="px-3 py-1 bg-zinc-700 text-white rounded hover:bg-zinc-800 text-sm"
							>
								Add Evidence
							</button>
							<button
								onClick={() => {
									setIsAddingEvidence(false);
									setNewEvidenceText("");
								}}
								className="px-3 py-1 border rounded hover:bg-gray-50 text-sm"
							>
								Cancel
							</button>
						</div>
					</div>
				)}

				{evidence.length === 0 ? (
					<p className="text-gray-500 text-sm italic">No evidence provided</p>
				) : (
					<ul className="space-y-2">
						{evidence.map((item) => (
							<li key={item.id} className="bg-gray-50 p-2 rounded">
								{isEditingEvidence === item.id ? (
									<div className="space-y-2">
										<textarea
											className="w-full border rounded-md p-2"
											rows={2}
											value={editText}
											onChange={(e) => setEditText(e.target.value)}
										/>
										<div className="flex gap-2">
											<button
												onClick={() => handleSaveEdit(item.id)}
												className="px-3 py-1 bg-zinc-700 text-white rounded hover:bg-zinc-800 text-sm"
											>
												Save
											</button>
											<button
												onClick={() => {
													setIsEditingEvidence(null);
													setEditText("");
												}}
												className="px-3 py-1 border rounded hover:bg-gray-50 text-sm"
											>
												Cancel
											</button>
										</div>
									</div>
								) : (
									<div className="flex justify-between items-start">
										<p className="text-sm">{item.text}</p>
										<div className="flex gap-2">
											<button
												onClick={() => handleStartEditEvidence(item)}
												className="text-xs text-blue-600 hover:text-blue-800"
											>
												Edit
											</button>
											<button
												onClick={() => onDelete(item.id, "evidence")}
												className="text-xs text-red-600 hover:text-red-800"
											>
												Delete
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
