class RetirementForecaster {
	constructor() {
		this.form = document.querySelector("form");
		this.resultsDiv = document.getElementById("results");
		this.formUsed = false; // track form usage after page load
		this.calculateButtonClicked = false; // track if calculate button was clicked
		this.initializeEventListeners();
		this.loadSavedValues();
		this.getForecast();
	}

	initializeEventListeners() {
		this.form.addEventListener("input", this.handleInput.bind(this));
		document.getElementById("calculateButton").addEventListener("click", () => {
			this.formUsed = true;
			this.calculateButtonClicked = true;
			this.getForecast();
		});
		window.addEventListener("beforeunload", this.saveFormValues.bind(this));
		// display toggles
		document
			.getElementById("showIncomeOptions")
			.addEventListener("click", (event) => {
				event.preventDefault();
				document.getElementById("incomeOptions").classList.remove("hidden");
				document.getElementById("showIncomeOptions").style.display = "none";
			});
		document
			.getElementById("showAdvancedOptions")
			.addEventListener("click", (event) => {
				event.preventDefault();
				document.getElementById("advancedOptions").classList.toggle("hidden");
				document.querySelector(".advanced-options-summary").style.display =
					"none";
			});
	}

	handleInput(event) {
		this.debounce(() => {
			this.formUsed = true;
			this.saveFormValues();
			this.getForecast();
		}, 300)();
	}

	debounce(func, wait) {
		let timeout;
		return function executedFunction(...args) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}

	loadSavedValues() {
		const formElements = document.querySelectorAll("form .form-group input");
		for (const element of formElements) {
			const savedValue = localStorage.getItem(element.id);
			if (savedValue) {
				const initialValue = element.getAttribute("value");
				element.value = savedValue;
				// show income options if values are saved
				if (
					["incomeGrowthRate", "socialSecurityIncome"].includes(element.id) &&
					savedValue
				) {
					document.getElementById("incomeOptions").classList.remove("hidden");
					document.getElementById("showIncomeOptions").style.display = "none";
				}
				// show advanced options if values are different from initial values
				if (
					[
						"contributionRate",
						"investmentGrowthRate",
						"withdrawalRate",
						"inflationRate",
					].includes(element.id) &&
					savedValue
				) {
					if (savedValue !== initialValue) {
						document
							.getElementById("advancedOptions")
							.classList.remove("hidden");
						document.querySelector(".advanced-options-summary").style.display =
							"none";
					}
				}
			}
		}
	}

	saveFormValues() {
		const formElements = document.querySelectorAll("form .form-group input");
		for (const element of formElements) {
			localStorage.setItem(element.id, element.value);
		}
	}

	getForecast() {
		if (!this.validateForm()) {
			this.resultsDiv.style.display = "none";
			return;
		}

		// ensure required fields are filled out
		const requiredFields = Array.from(
			document.querySelectorAll("form .form-group input[required]"),
		);
		if (!requiredFields.every((element) => element.value)) {
			this.resultsDiv.style.display = "none";
			return;
		}

		const inputs = this.getFormInputs();
		if (!inputs || !this.validateInputs(inputs)) {
			this.resultsDiv.style.display = "none";
			return;
		}

		const result = this.calculateForecast(inputs);
		this.displayResults(result, inputs.socialSecurityIncome);
	}

	validateForm() {
		let isValid = true;
		if (this.formUsed && !this.form.checkValidity()) {
			for (const field of this.form.elements) {
				if (field.tagName === "INPUT") {
					if (
						!field.checkValidity() &&
						(field.validationMessage !== "Fill out this field" ||
							this.calculateButtonClicked)
					) {
						this.showInputError(field.id, field.validationMessage);
						isValid = false;
					} else {
						this.showInputError(field.id, "");
					}
				}
			}
		}
		this.calculateButtonClicked = false; // done with flag, reset to initial state
		return isValid;
	}

	getFormInputs() {
		const inputParser = {
			currentAge: (value) => Number.parseInt(value, 10),
			annualIncome: (value) => Number.parseFloat(value),
			incomeGrowthRate: (value) => Number.parseFloat(value) / 100 || 0,
			retirementAge: (value) => Number.parseInt(value, 10),
			currentSavings: (value) => Number.parseFloat(value) || 0,
			contributionRate: (value) => Number.parseFloat(value) / 100,
			investmentGrowthRate: (value) => Number.parseFloat(value) / 100,
			withdrawalRate: (value) => Number.parseFloat(value) / 100,
			inflationRate: (value) => Number.parseFloat(value) / 100,
			socialSecurityIncome: (value) => Number.parseFloat(value),
		};
		const inputs = {};
		const formElements = document.querySelectorAll("form .form-group input");
		for (const element of formElements) {
			if (inputParser[element.id]) {
				try {
					inputs[element.id] = inputParser[element.id](element.value);
				} catch (error) {
					this.showInputError(element.id, "Please enter a valid number.");
					return null;
				}
			}
		}
		return inputs;
	}

	validateInputs(inputs) {
		const minAge = 18;
		const maxAge = 100;
		const maxContributionRage = 100;
		const maxWithdrawalRate = 100;

		const inputValidation = {
			currentAge: (value) => value >= minAge && value <= maxAge,
			annualIncome: (value) => value >= 0,
			incomeGrowthRate: (value) => !value || (value >= -100 && value <= 1000),
			retirementAge: (value, currentAge) =>
				value > currentAge && value <= maxAge,
			currentSavings: (value) => !value || value >= 0,
			contributionRate: (value) => value >= 0 && value <= maxContributionRage,
			investmentGrowthRate: (value) => value >= -100 && value <= 1000,
			withdrawalRate: (value) => value >= 0 && value <= maxWithdrawalRate,
			inflationRate: (value) => value >= -100 && value <= 1000,
			socialSecurityIncome: (value) => !value || value >= 0,
		};

		for (const [key, value] of Object.entries(inputs)) {
			if (inputValidation[key]) {
				const isValid =
					key === "retirementAge"
						? inputValidation[key](value, inputs.currentAge)
						: inputValidation[key](value);
				if (!isValid) {
					this.showInputError(
						key,
						`Invalid ${key.replace(/([A-Z])/g, " $1").toLowerCase()}`,
					);
				} else {
					this.showInputError(key, "");
				}
			}
		}

		return true;
	}

	showInputError(key, message) {
		const errorElement = document.getElementById(`${key}-error`);
		if (message) {
			if (errorElement) {
				errorElement.textContent = message;
				errorElement.style.display = "block";
			}
			document.getElementById(key).classList.add("error");
		} else {
			if (errorElement) {
				errorElement.style.display = "none";
			}
			document.getElementById(key).classList.remove("error");
		}
	}

	calculateForecast({
		currentAge,
		retirementAge,
		currentSavings,
		annualIncome,
		contributionRate,
		investmentGrowthRate,
		incomeGrowthRate,
		withdrawalRate,
		inflationRate,
	}) {
		const yearsUntilRetirement = retirementAge - currentAge;
		let savings = currentSavings;
		const yearlyData = [];

		for (let year = 0; year < yearsUntilRetirement; year++) {
			const currentYear = new Date().getFullYear() + year;
			const adjustedIncome = annualIncome * (1 + incomeGrowthRate) ** year;
			const annualContribution = adjustedIncome * contributionRate;

			const realGrowthRate =
				(1 + investmentGrowthRate) / (1 + inflationRate) - 1;

			savings = (savings + annualContribution) * (1 + realGrowthRate);

			yearlyData.push({
				year: currentYear,
				age: currentAge + year,
				savings: savings,
				contribution: annualContribution,
				income: adjustedIncome,
			});
		}

		const annualWithdrawal = savings * withdrawalRate;
		return {
			totalSavings: savings.toFixed(2),
			annualWithdrawal: annualWithdrawal.toFixed(2),
			yearlyData,
		};
	}

	displayResults(result, socialSecurityIncome) {
		const formatter = new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		});

		this.resultsDiv.style.display = "block";

		document.getElementById("totalSavings").textContent =
			`Total Savings at Retirement: ${formatter.format(result.totalSavings)}`;
		document.getElementById("annualWithdrawal").textContent =
			`Annual Withdrawal: ${formatter.format(result.annualWithdrawal)}`;

		const socialSecurityElement = document.getElementById(
			"annualSocialSecurity",
		);
		if (socialSecurityIncome) {
			socialSecurityElement.textContent = `Estimated Annual Social Security: ${formatter.format(socialSecurityIncome)}`;
			socialSecurityElement.classList.remove("hidden");
		} else {
			socialSecurityElement.classList.add("hidden");
		}

		const monthlyIncome =
			(Number.parseFloat(result.annualWithdrawal) +
				(socialSecurityIncome || 0)) /
			12;
		const monthlyIncomeElement =
			document.getElementById("monthlyIncome") || document.createElement("p");
		monthlyIncomeElement.id = "monthlyIncome";
		monthlyIncomeElement.textContent = `Projected Monthly Income: ${formatter.format(monthlyIncome)}`;
		this.resultsDiv.appendChild(monthlyIncomeElement);
	}
}

document.addEventListener("DOMContentLoaded", () => {
	const forecaster = new RetirementForecaster();
});
