// Application Constants
const CALCULATION_TOLERANCE = 0.05; // 5% tolerance for validation

const INPUT_FIELD_CONFIG = [
    { id: "inputVoltage", unitId: "inputVoltageUnit" },
    { id: "outputVoltage", unitId: "outputVoltageUnit" },
    { id: "outputCurrent", unitId: "outputCurrentUnit" },
    { id: "switchingFrequency", unitId: "switchingFrequencyUnit" },
    { id: "inductance", unitId: "inductanceUnit" },
    { id: "capacitance", unitId: "capacitanceUnit" },
    { id: "inductorCurrentRipple", unitId: "inductorCurrentRippleUnit" },
    { id: "outputVoltageRipple", unitId: "outputVoltageRippleUnit" },
    { id: "voltageRippleRatio", unitId: "voltageRippleRatioUnit" },
    { id: "currentRippleRatio", unitId: "currentRippleRatioUnit" }
];

const UNIT_FIELD_IDS = [
    "inputVoltageUnit", "outputVoltageUnit", "outputCurrentUnit",
    "switchingFrequencyUnit", "inductanceUnit", "capacitanceUnit",
    "inductorCurrentRippleUnit", "outputVoltageRippleUnit",
    "voltageRippleRatioUnit", "currentRippleRatioUnit"
];

// Utility Functions
function getInputValue(fieldId, unitFieldId) {
    const numericValue = parseFloat(document.getElementById(fieldId).value);
    const unitMultiplier = parseFloat(document.getElementById(unitFieldId).value);
    return isNaN(numericValue) ? null : numericValue * unitMultiplier;
}

function formatOutputValue(value, unitType) {
    if (value === null || value === undefined || isNaN(value)) return "N/A";

    const formatters = {
        "H": (val) => {
            if (val >= 1) return `${val.toPrecision(4)} H`;
            if (val >= 0.001) return `${(val * 1000).toPrecision(4)} mH`;
            return `${(val * 1000000).toPrecision(4)} µH`;
        },
        "F": (val) => {
            if (val >= 0.001) return `${(val * 1000).toPrecision(4)} mF`;
            if (val >= 0.000001) return `${(val * 1000000).toPrecision(4)} µF`;
            if (val >= 0.000000001) return `${(val * 1000000000).toPrecision(4)} nF`;
            return `${(val * 1000000000000).toPrecision(4)} pF`;
        },
        "Hz": (val) => {
            if (val >= 1000000) return `${(val / 1000000).toPrecision(4)} MHz`;
            if (val >= 1000) return `${(val / 1000).toPrecision(4)} kHz`;
            return `${val.toPrecision(4)} Hz`;
        },
        "V": (val) => val >= 1 ? `${val.toPrecision(4)} V` : `${(val * 1000).toPrecision(4)} mV`,
        "A": (val) => val >= 1 ? `${val.toPrecision(4)} A` : `${(val * 1000).toPrecision(4)} mA`,
        "W": (val) => val >= 1 ? `${val.toPrecision(4)} W` : `${(val * 1000).toPrecision(4)} mW`,
        "%": (val) => `${(val * 100).toPrecision(3)}%`,
        "Ω": (val) => {
            if (val >= 1000000) return `${(val / 1000000).toPrecision(4)} MΩ`;
            if (val >= 1000) return `${(val / 1000).toPrecision(4)} kΩ`;
            return `${val.toPrecision(4)} Ω`;
        },
        "ratio": (val) => val.toPrecision(4),
        "default": (val) => val.toPrecision(4)
    };

    return (formatters[unitType] || formatters["default"])(value);
}

// Validation Functions
function validateInputConsistency(calculationParameters) {
    const {
        inputVoltage, outputVoltage, outputCurrent, switchingFrequency,
        inductance, capacitance, inductorCurrentRipple, outputVoltageRipple,
        dutyCycle, voltageRippleRatio, currentRippleRatio
    } = calculationParameters;

    const validationWarnings = [];
    const validationErrors = [];

    // Validate duty cycle consistency: D = Vout/Vin
    if (dutyCycle !== null && inputVoltage !== null && outputVoltage !== null) {
        const expectedDutyCycle = outputVoltage / inputVoltage;
        if (Math.abs(dutyCycle - expectedDutyCycle) > CALCULATION_TOLERANCE) {
            validationErrors.push(
                `Duty cycle mismatch: Input D = ${dutyCycle.toPrecision(3)}, but Vout/Vin = ${expectedDutyCycle.toPrecision(3)}`
            );
        }
    }

    // Validate inductor ripple consistency: ΔIL = (Vin-Vout)*D/(L*Fs)
    if (inductorCurrentRipple !== null && inputVoltage !== null && outputVoltage !== null &&
        dutyCycle !== null && inductance !== null && switchingFrequency !== null) {
        const expectedRipple = (inputVoltage - outputVoltage) * dutyCycle / (inductance * switchingFrequency);
        const tolerance = Math.abs(expectedRipple * CALCULATION_TOLERANCE);
        if (Math.abs(inductorCurrentRipple - expectedRipple) > tolerance) {
            validationErrors.push(
                `Inductor ripple mismatch: Input ΔIL = ${formatOutputValue(inductorCurrentRipple, "A")}, calculated = ${formatOutputValue(expectedRipple, "A")}`
            );
        }
    }

    // Validate output ripple consistency: ΔVout = ΔIL/(8*Fs*C)
    if (outputVoltageRipple !== null && inductorCurrentRipple !== null &&
        switchingFrequency !== null && capacitance !== null) {
        const expectedOutputRipple = inductorCurrentRipple / (8 * switchingFrequency * capacitance);
        const tolerance = Math.abs(expectedOutputRipple * CALCULATION_TOLERANCE);
        if (Math.abs(outputVoltageRipple - expectedOutputRipple) > tolerance) {
            validationErrors.push(
                `Output ripple mismatch: Input ΔVout = ${formatOutputValue(outputVoltageRipple, "V")}, calculated = ${formatOutputValue(expectedOutputRipple, "V")}`
            );
        }
    }

    // Validate voltage ripple ratio: ΔV/V = ΔVout/Vout
    if (voltageRippleRatio !== null && outputVoltageRipple !== null && outputVoltage !== null) {
        const expectedRatio = outputVoltageRipple / outputVoltage;
        if (Math.abs(voltageRippleRatio - expectedRatio) > CALCULATION_TOLERANCE) {
            validationErrors.push(
                `Voltage ripple ratio mismatch: Input ΔV/V = ${formatOutputValue(voltageRippleRatio, "%")}, but ΔVout/Vout = ${formatOutputValue(expectedRatio, "%")}`
            );
        }
    }

    // Validate current ripple ratio: ΔI/I = ΔIL/Iout
    if (currentRippleRatio !== null && inductorCurrentRipple !== null && outputCurrent !== null) {
        const expectedRatio = inductorCurrentRipple / outputCurrent;
        if (Math.abs(currentRippleRatio - expectedRatio) > CALCULATION_TOLERANCE) {
            validationErrors.push(
                `Current ripple ratio mismatch: Input ΔI/I = ${formatOutputValue(currentRippleRatio, "%")}, but ΔIL/Iout = ${formatOutputValue(expectedRatio, "%")}`
            );
        }
    }

    // Physical constraints validation
    if (dutyCycle !== null && (dutyCycle <= 0 || dutyCycle >= 1)) {
        validationWarnings.push(`Duty cycle should be between 0 and 1. Current: ${dutyCycle.toPrecision(3)}`);
    }

    if (inputVoltage !== null && outputVoltage !== null && outputVoltage >= inputVoltage) {
        validationWarnings.push(
            `Buck converter requires Vout < Vin. Current: Vout = ${formatOutputValue(outputVoltage, "V")}, Vin = ${formatOutputValue(inputVoltage, "V")}`
        );
    }

    // Positive value checks
    const positiveChecks = [
        { value: switchingFrequency, name: "Switching frequency" },
        { value: inductance, name: "Inductance" },
        { value: capacitance, name: "Capacitance" },
        { value: outputCurrent, name: "Output current" }
    ];

    positiveChecks.forEach(check => {
        if (check.value !== null && check.value <= 0) {
            validationErrors.push(`${check.name} must be positive`);
        }
    });

    // Reasonable range warnings
    if (voltageRippleRatio !== null && (voltageRippleRatio <= 0 || voltageRippleRatio > 1)) {
        validationWarnings.push("Voltage ripple ratio should typically be 0-100%");
    }

    if (currentRippleRatio !== null && (currentRippleRatio <= 0 || currentRippleRatio > 1)) {
        validationWarnings.push("Current ripple ratio should typically be 0-100%");
    }

    return { warnings: validationWarnings, errors: validationErrors };
}

// Calculation Engine
function calculateMissingParameters(inputParams) {
    let {
        inputVoltage, outputVoltage, outputCurrent, switchingFrequency,
        inductance, capacitance, inductorCurrentRipple, outputVoltageRipple,
        dutyCycle, voltageRippleRatio, currentRippleRatio
    } = inputParams;

    const computedValues = {};

    // Calculate duty cycle
    if (dutyCycle === null && inputVoltage !== null && outputVoltage !== null) {
        dutyCycle = outputVoltage / inputVoltage;
        computedValues.dutyCycle = dutyCycle;
    }

    // Calculate input voltage
    if (inputVoltage === null && outputVoltage !== null && dutyCycle !== null) {
        inputVoltage = outputVoltage / dutyCycle;
        computedValues.inputVoltage = inputVoltage;
    }

    // Calculate output voltage
    if (outputVoltage === null && inputVoltage !== null && dutyCycle !== null) {
        outputVoltage = inputVoltage * dutyCycle;
        computedValues.outputVoltage = outputVoltage;
    }

    // Calculate inductor current ripple
    if (inductorCurrentRipple === null && inputVoltage !== null && outputVoltage !== null &&
        dutyCycle !== null && inductance !== null && switchingFrequency !== null) {
        inductorCurrentRipple = (inputVoltage - outputVoltage) * dutyCycle / (inductance * switchingFrequency);
        computedValues.inductorCurrentRipple = inductorCurrentRipple;
    }

    // Calculate minimum inductance
    if (inductance === null && inputVoltage !== null && outputVoltage !== null &&
        dutyCycle !== null && switchingFrequency !== null && inductorCurrentRipple !== null) {
        inductance = (inputVoltage - outputVoltage) * dutyCycle / (inductorCurrentRipple * switchingFrequency);
        computedValues.inductance = inductance;
    }

    // Calculate switching frequency
    if (switchingFrequency === null && inputVoltage !== null && outputVoltage !== null &&
        dutyCycle !== null && inductance !== null && inductorCurrentRipple !== null) {
        switchingFrequency = (inputVoltage - outputVoltage) * dutyCycle / (inductance * inductorCurrentRipple);
        computedValues.switchingFrequency = switchingFrequency;
    }

    // Calculate output voltage ripple
    if (outputVoltageRipple === null && inductorCurrentRipple !== null &&
        switchingFrequency !== null && capacitance !== null) {
        outputVoltageRipple = inductorCurrentRipple / (8 * switchingFrequency * capacitance);
        computedValues.outputVoltageRipple = outputVoltageRipple;
    }

    // Calculate minimum capacitance
    if (capacitance === null && inductorCurrentRipple !== null &&
        switchingFrequency !== null && outputVoltageRipple !== null) {
        capacitance = inductorCurrentRipple / (8 * switchingFrequency * outputVoltageRipple);
        computedValues.capacitance = capacitance;
    }

    // Calculate voltage ripple ratio
    if (voltageRippleRatio === null && outputVoltageRipple !== null && outputVoltage !== null) {
        voltageRippleRatio = outputVoltageRipple / outputVoltage;
        computedValues.voltageRippleRatio = voltageRippleRatio;
    }

    // Calculate current ripple ratio
    if (currentRippleRatio === null && inductorCurrentRipple !== null && outputCurrent !== null) {
        currentRippleRatio = inductorCurrentRipple / outputCurrent;
        computedValues.currentRippleRatio = currentRippleRatio;
    }

    // Calculate output current from ripple ratio
    if (outputCurrent === null && inductorCurrentRipple !== null && currentRippleRatio !== null) {
        outputCurrent = inductorCurrentRipple / currentRippleRatio;
        computedValues.outputCurrent = outputCurrent;
    }

    // Calculate additional derived parameters
    if (inputVoltage !== null && outputCurrent !== null && dutyCycle !== null) {
        const inputCurrent = outputCurrent * dutyCycle;
        computedValues.inputCurrent = inputCurrent;
    }

    if (inputVoltage !== null && outputVoltage !== null && outputCurrent !== null) {
        const outputPower = outputVoltage * outputCurrent;
        const inputPower = outputPower; // Ideal case, ignoring losses
        computedValues.outputPower = outputPower;
        computedValues.inputPower = inputPower;
    }

    if (inputVoltage !== null && outputCurrent !== null && dutyCycle !== null && switchingFrequency !== null) {
        const peakSwitchCurrent = outputCurrent + (inductorCurrentRipple || 0) / 2;
        computedValues.peakSwitchCurrent = peakSwitchCurrent;
    }

    // Calculate ESR-related parameters if available
    if (outputVoltageRipple !== null && inductorCurrentRipple !== null && capacitance !== null && switchingFrequency !== null) {
        const capacitorRipple = inductorCurrentRipple / (8 * switchingFrequency * capacitance);
        const esrRipple = outputVoltageRipple - capacitorRipple;
        if (esrRipple > 0 && inductorCurrentRipple !== null) {
            const equivalentSeriesResistance = esrRipple / (inductorCurrentRipple / 2);
            computedValues.equivalentSeriesResistance = equivalentSeriesResistance;
        }
    }

    return computedValues;
}

// Display Functions
function renderCalculationResults(calculatedValues, validationWarnings = [], validationErrors = []) {
    const resultsContainer = document.getElementById('calculationResults');
    let htmlContent = '';

    // Display validation errors
    if (validationErrors.length > 0) {
        htmlContent += '<div class="alert alert-error">';
        htmlContent += '<strong>❌ Validation Errors:</strong><ul style="margin: 10px 0; padding-left: 20px;">';
        validationErrors.forEach(error => htmlContent += `<li>${error}</li>`);
        htmlContent += '</ul></div>';
    }

    // Display validation warnings
    if (validationWarnings.length > 0) {
        htmlContent += '<div class="alert alert-warning">';
        htmlContent += '<strong>⚠️ Design Warnings:</strong><ul style="margin: 10px 0; padding-left: 20px;">';
        validationWarnings.forEach(warning => htmlContent += `<li>${warning}</li>`);
        htmlContent += '</ul></div>';
    }

    // Display calculated results
    const resultCategories = [
        {
            title: "⚡ Basic Parameters",
            items: [
                { key: 'dutyCycle', label: 'Duty Cycle (D)', unit: 'ratio' },
                { key: 'inputVoltage', label: 'Input Voltage (Vin)', unit: 'V' },
                { key: 'outputVoltage', label: 'Output Voltage (Vout)', unit: 'V' },
                { key: 'inputCurrent', label: 'Input Current (Iin)', unit: 'A' },
                { key: 'outputCurrent', label: 'Output Current (Iout)', unit: 'A' }
            ]
        },
        {
            title: "🔧 Component Values",
            items: [
                { key: 'inductance', label: 'Inductance (L)', unit: 'H' },
                { key: 'capacitance', label: 'Capacitance (C)', unit: 'F' },
                { key: 'switchingFrequency', label: 'Switching Frequency (Fs)', unit: 'Hz' },
                { key: 'equivalentSeriesResistance', label: 'ESR (Req)', unit: 'Ω' }
            ]
        },
        {
            title: "📊 Ripple Analysis",
            items: [
                { key: 'inductorCurrentRipple', label: 'Inductor Current Ripple (ΔIL)', unit: 'A' },
                { key: 'outputVoltageRipple', label: 'Output Voltage Ripple (ΔVout)', unit: 'V' },
                { key: 'voltageRippleRatio', label: 'Voltage Ripple Ratio (ΔV/V)', unit: '%' },
                { key: 'currentRippleRatio', label: 'Current Ripple Ratio (ΔI/I)', unit: '%' }
            ]
        },
        {
            title: "⚡ Power & Performance",
            items: [
                { key: 'outputPower', label: 'Output Power (Pout)', unit: 'W' },
                { key: 'inputPower', label: 'Input Power (Pin)', unit: 'W' },
                { key: 'peakSwitchCurrent', label: 'Peak Switch Current', unit: 'A' }
            ]
        }
    ];

    let hasResults = false;

    resultCategories.forEach(category => {
        const categoryItems = category.items.filter(item =>
            calculatedValues[item.key] !== undefined && calculatedValues[item.key] !== null
        );

        if (categoryItems.length > 0) {
            hasResults = true;
            htmlContent += `<div style="margin-bottom: 25px;">`;
            htmlContent += `<h4 style="color: #667eea; margin-bottom: 15px; font-size: 1.1rem;">${category.title}</h4>`;

            categoryItems.forEach(item => {
                const displayValue = formatOutputValue(calculatedValues[item.key], item.unit);
                htmlContent += `
              <div class="result-item">
                <div class="result-label">${item.label}</div>
                <div class="result-value">${displayValue}</div>
              </div>`;
            });

            htmlContent += `</div>`;
        }
    });

    // Show empty state if no results
    if (!hasResults && validationWarnings.length === 0 && validationErrors.length === 0) {
        htmlContent = `
          <div class="empty-state">
            <div style="font-size: 3rem; margin-bottom: 10px;">📊</div>
            <p>No calculations performed yet.<br>Enter parameters and click Calculate.</p>
          </div>`;
    } else if (!hasResults && (validationWarnings.length > 0 || validationErrors.length > 0)) {
        htmlContent += `
          <div class="alert alert-info">
            <strong>ℹ️ Info:</strong> Fix the validation issues above to see calculated results.
          </div>`;
    }

    resultsContainer.innerHTML = htmlContent;
}

// Main Application Functions
function performCalculation() {
    // Collect all input parameters
    const calculationParameters = {
        inputVoltage: getInputValue("inputVoltage", "inputVoltageUnit"),
        outputVoltage: getInputValue("outputVoltage", "outputVoltageUnit"),
        outputCurrent: getInputValue("outputCurrent", "outputCurrentUnit"),
        switchingFrequency: getInputValue("switchingFrequency", "switchingFrequencyUnit"),
        inductance: getInputValue("inductance", "inductanceUnit"),
        capacitance: getInputValue("capacitance", "capacitanceUnit"),
        inductorCurrentRipple: getInputValue("inductorCurrentRipple", "inductorCurrentRippleUnit"),
        outputVoltageRipple: getInputValue("outputVoltageRipple", "outputVoltageRippleUnit"),
        voltageRippleRatio: getInputValue("voltageRippleRatio", "voltageRippleRatioUnit"),
        currentRippleRatio: getInputValue("currentRippleRatio", "currentRippleRatioUnit"),
        dutyCycle: parseFloat(document.getElementById("dutyCycle").value) || null
    };

    // Validate input consistency
    const validationResults = validateInputConsistency(calculationParameters);

    let computedParameters = {};

    // Perform calculations only if no validation errors
    if (validationResults.errors.length === 0) {
        computedParameters = calculateMissingParameters(calculationParameters);
    }

    // Display results with validation feedback
    renderCalculationResults(
        computedParameters,
        validationResults.warnings,
        validationResults.errors
    );
}

function clearAllInputs() {
    // Clear all numeric input fields
    INPUT_FIELD_CONFIG.forEach(config => {
        document.getElementById(config.id).value = "";
    });

    // Clear duty cycle field
    document.getElementById("dutyCycle").value = "";

    // Reset all unit selectors to default values
    const defaultUnitValues = [1, 1, 1, 1000, 0.000001, 0.000001, 1, 0.001, 0.01, 0.01];
    UNIT_FIELD_IDS.forEach((unitId, index) => {
        document.getElementById(unitId).value = defaultUnitValues[index];
    });

    // Reset results display
    document.getElementById('calculationResults').innerHTML = `
        <div class="empty-state">
          <div style="font-size: 3rem; margin-bottom: 10px;">🔍</div>
          <p>Enter your parameters and click Calculate to see detailed results...</p>
        </div>`;
}

// Add input event listeners for real-time validation
document.addEventListener('DOMContentLoaded', function () {
    // Add event listeners to all input fields for enter key
    const allInputs = document.querySelectorAll('input[type="number"]');
    allInputs.forEach(input => {
        input.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') {
                performCalculation();
            }
        });

        // Add input validation styling
        input.addEventListener('input', function () {
            if (this.value && parseFloat(this.value) < 0) {
                this.style.borderColor = '#f44336';
            } else {
                this.style.borderColor = '#e0e6ed';
            }
        });
    });

    // Add tooltips for better user experience
    const tooltips = {
        'inputVoltage': 'DC input voltage to the buck converter',
        'outputVoltage': 'Desired DC output voltage',
        'outputCurrent': 'Maximum load current',
        'switchingFrequency': 'MOSFET/transistor switching frequency',
        'dutyCycle': 'PWM duty cycle (0 to 1)',
        'inductance': 'Filter inductor value',
        'capacitance': 'Output filter capacitor value',
        'inductorCurrentRipple': 'Peak-to-peak inductor current variation',
        'outputVoltageRipple': 'Peak-to-peak output voltage variation'
    };

    Object.keys(tooltips).forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.title = tooltips[inputId];
        }
    });
});