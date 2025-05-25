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

const PERCENTAGES = [0.25, 0.5, 1, 2];

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
  const [weight, setWeight] = useState(70);
  const [used, setUsed] = useState(INITIAL_USED_STATE);
  const [usedList, setUsedList] = useState([]);
  const [selectedDrug, setSelectedDrug] = useState('lidocaine');
  const [inputDose, setInputDose] = useState('');
  const [inputVolume, setInputVolume] = useState('');
  const [remainingDoses, setRemainingDoses] = useState({});
  const [selectedPercentage, setSelectedPercentage] = useState(1);
  const [showWarning, setShowWarning] = useState(false);
  const [activeInput, setActiveInput] = useState(null);

  // Calculate max doses based on weight
  const calculateMaxDose = useCallback((weight) => {
    const dose = {};
    for (const [name, value] of Object.entries(RATIOS)) {
      dose[name] = value * weight;
    }
    return dose;
  }, []);

  // Convert dose in mg to volume in ml
  const doseToMl = useCallback((dose, percentage) => {
    return dose / (percentage * 10);
  }, []);

  // Convert volume in ml to dose in mg
  const mlToDose = useCallback((ml, percentage) => {
    return ml * percentage * 10;
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
    // Limit weight between 1 and 150
    let newWeight = parseFloat(e.target.value) || 0;
    newWeight = Math.min(Math.max(newWeight, 1), 150);
    
    // Only actually change weight if it's at least 1
    if (newWeight >= 1) {
      setWeight(newWeight);
      resetCalculator();
    } else {
      setWeight(1);
    }
  }, [resetCalculator]);

  // Handle dose input change and update volume
  const handleDoseChange = useCallback((value) => {
    setActiveInput('dose');
    setInputDose(value);
    
    if (value && !isNaN(parseFloat(value))) {
      const doseValue = parseFloat(value);
      const rawVolume = doseToMl(doseValue, selectedPercentage);
      setInputVolume(rawVolume.toString());
    } else {
      setInputVolume('');
    }
  }, [doseToMl, selectedPercentage]);

  // Handle volume input change and update dose
  const handleVolumeChange = useCallback((value) => {
    setActiveInput('volume');
    setInputVolume(value);
    
    if (value && !isNaN(parseFloat(value))) {
      const volumeValue = parseFloat(value);
      const rawDose = mlToDose(volumeValue, selectedPercentage);
      setInputDose(rawDose.toString());
    } else {
      setInputDose('');
    }
  }, [mlToDose, selectedPercentage]);

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
    const newUsedList = [
      ...usedList,
      {
        drug: selectedDrug,
        displayName: DISPLAY_NAMES[selectedDrug],
        dose: dose,
        volume: volume,
        percentage: selectedPercentage
      }
    ];
    setUsedList(newUsedList);
    
    const newUsed = { ...used };
    newUsed[selectedDrug] = (newUsed[selectedDrug] || 0) + dose;
    setUsed(newUsed);
    
    setInputDose('');
    setInputVolume('');
    setActiveInput(null);
  }, [inputDose, inputVolume, remainingDoses, selectedDrug, usedList, used, selectedPercentage]);
  
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
    const remaining = calculateRemaining(weight, used);
    setRemainingDoses(remaining);
  }, [weight, used, calculateRemaining]);
  
  // Update calculated value when percentage changes
  useEffect(() => {
    if (inputDose && !isNaN(parseFloat(inputDose))) {
      if (activeInput === 'dose' || activeInput === null) {
        const volume = doseToMl(parseFloat(inputDose), selectedPercentage);
        setInputVolume(volume.toString());
      } 
      else if (activeInput === 'volume' && inputVolume && !isNaN(parseFloat(inputVolume))) {
        const dose = mlToDose(parseFloat(inputVolume), selectedPercentage);
        setInputDose(dose.toString());
      }
    }
  }, [selectedPercentage, inputDose, inputVolume, activeInput, doseToMl, mlToDose]);

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
          Patient Weight (kg):
          <input
            type="number"
            value={weight}
            onChange={handleWeightChange}
            className="weight-input"
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
                    {item.displayName}: {item.dose.toFixed(1)} mg ({item.volume.toFixed(1)} ml of {item.percentage}%)
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
              Volume at {selectedPercentage}% (ml)
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
      
      {/* Percentage selector */}
      <div className="section">
        <label className="percentage-label">
          Select Concentration (%):
          <select
            value={selectedPercentage}
            onChange={(e) => setSelectedPercentage(parseFloat(e.target.value))}
            className="percentage-select"
          >
            {PERCENTAGES.map(p => (
              <option key={p} value={p}>{p}</option>
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
                <th className="table-header-cell table-header-cell-right">Remaining (mg)</th>
                <th className="table-header-cell table-header-cell-right">Volume (ml) at {selectedPercentage}%</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(remainingDoses).map(name => (
                <tr key={name} className="table-row">
                  <td className="table-cell">{DISPLAY_NAMES[name]}</td>
                  <td className="table-cell table-cell-right">
                    {remainingDoses[name]?.toFixed(1) || 0}
                  </td>
                  <td className="table-cell table-cell-right">
                    {doseToMl(remainingDoses[name] || 0, selectedPercentage).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Disclaimer and Citations */}
      <div className="disclaimer-section">
        <h3 className="disclaimer-title">Disclaimer</h3>
        <p className="disclaimer-text">
          This calculator is available as a guide only and does not replace clinical discretion. 
          Always calculate the dose based on lean body weight to reduce toxicity risks. 
          For children and elderly patients, maximum doses should generally be halved.
        </p>
        
        <h3 className="disclaimer-title">References</h3>
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
    </div>
  );
};

export default LocalAnaestheticCalculator;