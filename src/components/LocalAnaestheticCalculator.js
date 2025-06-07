import React, { useState, useEffect, useCallback } from 'react';
import './LocalAnaestheticCalculator.css';

// Constants moved outside component to prevent recreation on every render
const RATIOS = {
  lidocaine: 3,
  lidocaine_epinephrine: 5,
  bupivacaine: 2,
  levobupivacaine: 2,
  ropivacaine: 3,
  prilocaine: 6,
  mepivacaine: 4.4
};

const ABSOLUTE_MAX_DOSES = {
  lidocaine: 300,
  lidocaine_epinephrine: 500,
  bupivacaine: 175,
  levobupivacaine: NaN,
  ropivacaine: 200,
  prilocaine: 400,
  mepivacaine: 350
};

const DISPLAY_NAMES = {
  lidocaine: 'Lidocaine',
  lidocaine_epinephrine: 'Lidocaine with Epinephrine',
  bupivacaine: 'Bupivacaine',
  levobupivacaine: 'Levobupivacaine',
  ropivacaine: 'Ropivacaine',
  prilocaine: 'Prilocaine',
  mepivacaine: 'Mepivacaine'
};

// Updated concentrations in mg/ml with corresponding percentages
const CONCENTRATIONS = [
  { mgMl: 2.5, percentage: 0.25 },
  { mgMl: 5, percentage: 0.5 },
  { mgMl: 7.5, percentage: 0.75 },
  { mgMl: 10, percentage: 1 },
  { mgMl: 20, percentage: 2 },
  { mgMl: 40, percentage: 4 }
];

const INITIAL_USED_STATE = {
  lidocaine: 0,
  lidocaine_epinephrine: 0,
  bupivacaine: 0,
  levobupivacaine: 0,
  ropivacaine: 0,
  prilocaine: 0,
  mepivacaine: 0
};

const LocalAnaestheticCalculator = () => {
  // State hooks
  const [weight, setWeight] = useState('');
  const [used, setUsed] = useState(INITIAL_USED_STATE);
  const [usedList, setUsedList] = useState([]);
  const [selectedDrug, setSelectedDrug] = useState('lidocaine');
  const [inputDose, setInputDose] = useState('');
  const [inputVolume, setInputVolume] = useState('');
  const [remainingDoses, setRemainingDoses] = useState({});
  const [selectedConcentration, setSelectedConcentration] = useState(10); // Default to 10 mg/ml (1%)
  const [showWarning, setShowWarning] = useState(false);
  const [activeInput, setActiveInput] = useState(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [showExternalLinks, setShowExternalLinks] = useState(false);

  // Helper function to get percentage from mg/ml concentration
  const getPercentageFromConcentration = useCallback((mgMl) => {
    const concentration = CONCENTRATIONS.find(c => c.mgMl === mgMl);
    return concentration ? concentration.percentage : mgMl / 10;
  }, []);

  // Calculate max doses based on weight
  const calculateMaxDose = useCallback((weight) => {
    const dose = {};
    for (const [name, value] of Object.entries(RATIOS)) {
      dose[name] = value * weight;
    }
    return dose;
  }, []);

  // Convert dose in mg to volume in ml using concentration in mg/ml
  const doseToMl = useCallback((dose, concentrationMgMl) => {
    return dose / concentrationMgMl;
  }, []);

  // Convert volume in ml to dose in mg using concentration in mg/ml
  const mlToDose = useCallback((ml, concentrationMgMl) => {
    return ml * concentrationMgMl;
  }, []);

  // Calculate remaining doses based on what's been used
  const calculateRemaining = useCallback((weight, used) => {
    const maxDose = calculateMaxDose(weight);
    
    // Calculate the percentage of the total max dose each value represents
    let pTotal = 0;
    for (const [name, value] of Object.entries(used)) {
      if (value > 0) {
        const percentage = value / maxDose[name];
        pTotal += percentage;
      }
    }
    
    // Ensure pTotal doesn't exceed 1 (100%)
    pTotal = Math.min(pTotal, 1);
    
    // Calculate remaining doses
    const remainingDose = {};
    for (const [name, value] of Object.entries(maxDose)) {
      // Calculate weight-based remaining dose
      const weightBasedRemaining = value * (1 - pTotal);
      
      // Check if there's an absolute max dose limit that isn't NaN
      if (!isNaN(ABSOLUTE_MAX_DOSES[name])) {
        // Use the smaller of the weight-based dose and absolute max dose
        const absoluteRemaining = Math.max(0, ABSOLUTE_MAX_DOSES[name] - (used[name] || 0));
        remainingDose[name] = Math.min(weightBasedRemaining, absoluteRemaining);
      } else {
        // If no absolute limit or it's NaN, just use the weight-based calculation
        remainingDose[name] = weightBasedRemaining;
      }
    }
    return remainingDose;
  }, [calculateMaxDose]);

  // Reset calculator to base state
  const resetCalculator = useCallback(() => {
    setUsed(INITIAL_USED_STATE);
    setUsedList([]);
    setInputDose('');
    setInputVolume('');
  }, []);

  // Handle weight input change
  const handleWeightChange = useCallback((e) => {
    const inputValue = e.target.value;
    
    // Allow empty input (for placeholder visibility)
    if (inputValue === '') {
      setWeight('');
      return;
    }
    
    // Parse and validate the weight
    const newWeight = parseFloat(inputValue);
    
    // Check if it's a valid number
    if (isNaN(newWeight)) {
      return; // Don't update if not a valid number
    }
    
    // Clamp weight between 1 and 150
    const clampedWeight = Math.min(Math.max(newWeight, 1), 150);
    
    // Update weight and reset calculator if weight is valid
    if (clampedWeight >= 1) {
      setWeight(clampedWeight);
      resetCalculator();
    }
  }, [resetCalculator]);

  // Handle dose input change and update volume
  const handleDoseChange = useCallback((value) => {
    setActiveInput('dose');
    setInputDose(value);
    
    if (value && !isNaN(parseFloat(value))) {
      const doseValue = parseFloat(value);
      const rawVolume = doseToMl(doseValue, selectedConcentration);
      setInputVolume(rawVolume.toString());
    } else {
      setInputVolume('');
    }
  }, [doseToMl, selectedConcentration]);

  // Handle volume input change and update dose
  const handleVolumeChange = useCallback((value) => {
    setActiveInput('volume');
    setInputVolume(value);
    
    if (value && !isNaN(parseFloat(value))) {
      const volumeValue = parseFloat(value);
      const rawDose = mlToDose(volumeValue, selectedConcentration);
      setInputDose(rawDose.toString());
    } else {
      setInputDose('');
    }
  }, [mlToDose, selectedConcentration]);

  // Add the current drug and dose to the used list
  const addUsedDose = useCallback(() => {
    if (!inputDose || isNaN(parseFloat(inputDose)) || parseFloat(inputDose) <= 0) {
      return;
    }

    const dose = parseFloat(inputDose);
    
    if (dose > (remainingDoses[selectedDrug] || 0)) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 5000);
      return;
    }
    
    const volume = parseFloat(inputVolume);
    const percentage = getPercentageFromConcentration(selectedConcentration);
    const newUsedList = [
      ...usedList,
      {
        drug: selectedDrug,
        displayName: DISPLAY_NAMES[selectedDrug],
        dose: dose,
        volume: volume,
        concentrationMgMl: selectedConcentration,
        percentage: percentage
      }
    ];
    setUsedList(newUsedList);
    
    const newUsed = { ...used };
    newUsed[selectedDrug] = (newUsed[selectedDrug] || 0) + dose;
    setUsed(newUsed);
    
    setInputDose('');
    setInputVolume('');
    setActiveInput(null);
  }, [inputDose, inputVolume, remainingDoses, selectedDrug, usedList, used, selectedConcentration, getPercentageFromConcentration]);
  
  // Remove a dose from the used list
  const removeDose = useCallback((index) => {
    const doseToRemove = usedList[index];
    const newUsedList = usedList.filter((_, i) => i !== index);
    setUsedList(newUsedList);
    
    const newUsed = { ...used };
    newUsed[doseToRemove.drug] = Math.max(0, (newUsed[doseToRemove.drug] || 0) - doseToRemove.dose);
    setUsed(newUsed);
  }, [usedList, used]);

  // Update calculations when weight or used doses change
  useEffect(() => {
    // Only calculate if we have a valid weight
    if (weight && !isNaN(parseFloat(weight)) && parseFloat(weight) >= 1) {
      const remaining = calculateRemaining(parseFloat(weight), used);
      setRemainingDoses(remaining);
    } else {
      // Clear remaining doses if no valid weight
      setRemainingDoses({});
    }
  }, [weight, used, calculateRemaining]);
  
  // Update calculated value when concentration changes
  useEffect(() => {
    if (inputDose && !isNaN(parseFloat(inputDose))) {
      if (activeInput === 'dose' || activeInput === null) {
        const volume = doseToMl(parseFloat(inputDose), selectedConcentration);
        setInputVolume(volume.toString());
      } 
      else if (activeInput === 'volume' && inputVolume && !isNaN(parseFloat(inputVolume))) {
        const dose = mlToDose(parseFloat(inputVolume), selectedConcentration);
        setInputDose(dose.toString());
      }
    }
  }, [selectedConcentration, inputDose, inputVolume, activeInput, doseToMl, mlToDose]);



  return (
    <div className="calculator-container">
      {/* Warning popup */}
      {showWarning && (
        <div className="warning-popup">
          Warning! The dose you are using is beyond the recommended safe limit for this patient
        </div>
      )}
      
      <h1 className="main-title">
        Total Local Anaesthetic Dose Calculator
      </h1>
      
      {/* Weight input */}
      <div className="section">
        <label className="weight-label">
          Ideal Body Weight (kg):
          <input
            type="number"
            value={weight}
            onChange={handleWeightChange}
            className="weight-input"
            placeholder="Type a weight to start (1 - 150 kg)"
            min="1"
            max="150"
          />
        </label>
      </div>
      
      {/* Used doses section */}
      <div className="section">
        <h2 className="section-title">Used Doses</h2>
        
        {/* Display list of used doses */}
        {usedList.length > 0 && (
          <div className="used-doses-list">
            <h3 className="used-doses-title">Added Doses:</h3>
            <ul className="used-doses-ul">
              {usedList.map((item, index) => (
                <li key={index} className="used-dose-item">
                  <span>
                    {item.displayName}: {item.dose.toFixed(1)} mg ({item.volume.toFixed(1)} ml of {item.concentrationMgMl} mg/ml)
                  </span>
                  <button 
                    onClick={() => removeDose(index)}
                    className="remove-button"
                    aria-label="Remove dose"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Input for new used dose */}
        <div className="input-form">
          {/* Drug selector */}
          <div className="input-group">
            <label className="input-label">
              Anaesthetic Agent
            </label>
            <select
              value={selectedDrug}
              onChange={(e) => setSelectedDrug(e.target.value)}
              className="select-field"
            >
              {Object.keys(DISPLAY_NAMES).map(name => (
                <option key={name} value={name}>{DISPLAY_NAMES[name]}</option>
              ))}
            </select>
          </div>
          
          {/* Dose input */}
          <div className="input-group-narrow">
            <label className="input-label">
              Dose (mg)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={inputDose}
              onChange={(e) => handleDoseChange(e.target.value)}
              onFocus={() => setActiveInput('dose')}
              className="input-field"
              placeholder="Enter dose"
            />
          </div>
          
          {/* Volume input */}
          <div className="input-group-narrow">
            <label className="input-label">
              Volume (ml) at {selectedConcentration} mg/ml
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={inputVolume}
              onChange={(e) => handleVolumeChange(e.target.value)}
              onFocus={() => setActiveInput('volume')}
              className="input-field"
              placeholder="Enter volume"
            />
          </div>
          
          {/* Add button */}
          <div className="input-group-button">
            <button
              onClick={addUsedDose}
              disabled={!inputDose || isNaN(parseFloat(inputDose)) || parseFloat(inputDose) <= 0}
              className="add-button"
            >
              Add Dose
            </button>
          </div>
        </div>
      </div>
      
      {/* Concentration selector */}
      <div className="section">
        <label className="percentage-label">
          Select Concentration:
          <select
            value={selectedConcentration}
            onChange={(e) => setSelectedConcentration(parseFloat(e.target.value))}
            className="percentage-select"
          >
            {CONCENTRATIONS.map(c => (
              <option key={c.mgMl} value={c.mgMl}>
                {c.mgMl} mg/ml ({c.percentage}%)
              </option>
            ))}
          </select>
        </label>
      </div>
      
      {/* Results table */}
      <div className="section">
        <h2 className="section-title">Remaining Safe Dose</h2>
        <div className="table-container">
          <table className="results-table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell table-header-cell-left">Anaesthetic</th>
                <th className="table-header-cell table-header-cell-right">Dose (mg)</th>
                <th className="table-header-cell table-header-cell-right">Volume (ml) at {selectedConcentration} mg/ml</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(DISPLAY_NAMES).map(name => (
                <tr key={name} className="table-row">
                  <td className="table-cell">{DISPLAY_NAMES[name]}</td>
                  <td className="table-cell table-cell-right">
                    {remainingDoses[name] ? remainingDoses[name].toFixed(1) : '-'}
                  </td>
                  <td className="table-cell table-cell-right">
                    {remainingDoses[name] ? doseToMl(remainingDoses[name], selectedConcentration).toFixed(1) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Disclaimer */}
      <div className="info-section">
        <h3 className="info-title">Disclaimer</h3>
        <p className="info-text">
          This calculator is available as a guide only and does not replace clinical discretion. It is approapriate for single shot administration and not continuous infusions. 
          Always calculate the dose based on ideal body weight to reduce toxicity risks. 
          For children and elderly patients, maximum doses should generally be halved.
        </p>
      </div>
      
      {/* How it Works - Collapsible */}
      <div className="info-section">
        <h3 className="info-title collapsible-header" onClick={() => setShowHowItWorks(!showHowItWorks)}>
          How it Works {showHowItWorks ? '▼' : '▶'}
        </h3>
        
        {showHowItWorks && (
          <div className="collapsible-content">
            <h4 className="formula-subtitle">Instructions:</h4>
            <p className="info-text">
              - Begin by typing the patient's ideal body weight. The calculator will then present the remaining recommended safe dose and volume for each anaesthetic agent. 
            </p>
            <p className="info-text">
              - The concentration of the solution can be adjusted using the drop down menu.
            </p>
            <p className="info-text">
              - Add the doses you have already used or plan to use and the calculator will adjust the respective remaining values.
            </p>
            
            <h4 className="formula-subtitle">Methodology:</h4>
            
            <h4 className="formula-subtitle">1. Maximum Allowable Dose Calculation</h4>
            <div className="formula-box">
              <strong>Max Dose (mg) = Weight (kg) × Drug-specific ratio (mg/kg)</strong>
            </div>
            <p className="info-text">
              Each local anaesthetic has a maximum safe dose per kilogram of body weight. The calculator multiplies 
              your patient's weight by the appropriate mg/kg ratio for each drug.
            </p>
            
            <h4 className="formula-subtitle">2. Volume Conversion</h4>
            <div className="formula-box">
              <strong>Volume (ml) = Dose (mg) ÷ Concentration (mg/ml)</strong>
            </div>
            <p className="info-text">
              To convert from milligrams to milliliters, the dose is divided by the concentration in mg/ml. 
              For example: 50mg at 10 mg/ml concentration = 50 ÷ 10 = 5ml
            </p>
            
            <h4 className="formula-subtitle">3. Total Anaesthetic Load Calculation</h4>
            <div className="formula-box">
              <strong>Total Load (%) = Σ (Used Dose of Agent ÷ Max Dose of Agent) × 100</strong>
            </div>
            <p className="info-text">
              The calculator tracks the total anaesthetic load by calculating what percentage of each drug's maximum 
              safe dose has been used, then summing these percentages. The remaining safe dose for each agent is 
              calculated by reducing all maximum doses proportionally based on this total load.
            </p>
            
            <h4 className="formula-subtitle">4. Drug-Specific Ratios (mg/kg)</h4>
            <div className="table-container">
              <table className="results-table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell table-header-cell-left">Local Anaesthetic</th>
                    <th className="table-header-cell table-header-cell-right">Plain (mg/kg)</th>
                    <th className="table-header-cell table-header-cell-right">Absolute Max (mg)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="table-row">
                    <td className="table-cell">Lidocaine</td>
                    <td className="table-cell table-cell-right">3</td>
                    <td className="table-cell table-cell-right">300</td>
                  </tr>
                  <tr className="table-row">
                    <td className="table-cell">Lidocaine with Epinephrine</td>
                    <td className="table-cell table-cell-right">5</td>
                    <td className="table-cell table-cell-right">500</td>
                  </tr>
                  <tr className="table-row">
                    <td className="table-cell">Bupivacaine</td>
                    <td className="table-cell table-cell-right">2</td>
                    <td className="table-cell table-cell-right">175</td>
                  </tr>
                  <tr className="table-row">
                    <td className="table-cell">Levobupivacaine</td>
                    <td className="table-cell table-cell-right">2</td>
                    <td className="table-cell table-cell-right">No limit</td>
                  </tr>
                  <tr className="table-row">
                    <td className="table-cell">Ropivacaine</td>
                    <td className="table-cell table-cell-right">3</td>
                    <td className="table-cell table-cell-right">200</td>
                  </tr>
                  <tr className="table-row">
                    <td className="table-cell">Prilocaine</td>
                    <td className="table-cell table-cell-right">6</td>
                    <td className="table-cell table-cell-right">400</td>
                  </tr>
                  <tr className="table-row">
                    <td className="table-cell">Mepivacaine</td>
                    <td className="table-cell table-cell-right">4.4</td>
                    <td className="table-cell table-cell-right">350</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="info-text">
              <strong>Note:</strong> The calculator uses the lower of either the weight-based maximum or the absolute 
              maximum dose limit (where applicable) to ensure patient safety.
            </p>
          </div>
        )}
      </div>
      
      {/* References - Collapsible */}
      <div className="info-section">
        <h3 className="info-title collapsible-header" onClick={() => setShowReferences(!showReferences)}>
          References {showReferences ? '▼' : '▶'}
        </h3>
        
        {showReferences && (
          <div className="collapsible-content">
            <ol className="references-list">
              <li className="reference-item">
                French J, Sharp LM. Local anaesthetics. Ann R Coll Surg Engl. 2012 Mar;94(2):76-80. 
                doi: 10.1308/003588412X13171221502185. PMID: 22391358; PMCID: PMC3954146.
              </li>
              <li className="reference-item">
                Nestor CC, Ng C, Sepulveda P, Irwin MG. Pharmacological and clinical implications of local 
                anaesthetic mixtures: a narrative review. Anaesthesia. 2022 Mar;77(3):339-350. 
                doi: 10.1111/anae.15641. Epub 2021 Dec 14. PMID: 34904711.
              </li>
              <li className="reference-item">
                El-Boghdadly K, Pawa A, Chin KJ. Local anesthetic systemic toxicity: current perspectives. 
                Local Reg Anesth. 2018 Aug 8;11:35-44. doi: 10.2147/LRA.S154512. PMID: 30122981; PMCID: PMC6087022.
              </li>
            </ol>
          </div>
        )}
      </div>
      
      {/* External Links - Collapsible */}
      <div className="info-section">
        <h3 className="info-title collapsible-header" onClick={() => setShowExternalLinks(!showExternalLinks)}>
          External Links {showExternalLinks ? '▼' : '▶'}
        </h3>
        
        {showExternalLinks && (
          <div className="collapsible-content">
            <ul className="external-links-list">
              <li className="external-link-item">
                <a 
                  href="https://anaesthetists.org/Portals/0/PDFs/QRH/QRH_3-10_Local_anaesthetic_toxicity_v2_June%202023.pdf?ver=2023-06-23-141010-760"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  QRH - Management of local anaesthetic toxicity (Updated June 23)
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
      
      {/* Last Updated */}
      <div className="last-updated">
        Last updated: June 1, 2025
      </div>
    </div>
  );
};

export default LocalAnaestheticCalculator;