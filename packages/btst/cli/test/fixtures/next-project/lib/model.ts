const modelName = process.env.BTST_FIXTURE_MODEL;

if (!modelName) {
	throw new Error("BTST_FIXTURE_MODEL was not loaded from the project env");
}

export { modelName };
