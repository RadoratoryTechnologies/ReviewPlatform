const POWER_STAGE_CHECKLIST = {
    title: "Power Stage Reviewer Checklist",
    project: "ServoDriverTI v1.1",
    role: "Power Stage & Power Electronics Expert",
    dateIssued: "2026-03-20",
    instructions: "This checklist covers the power stage, protection, power supply, EMI/EMC, and thermal aspects of the ServoDriverTI servo drive. Please mark each item as PASS / FAIL / N/A and add comments where needed.",
    specs: [
        "DC bus: 24-60V (nominal 48V)",
        "Continuous phase current: 5A",
        "Peak phase current: 15-20A (short duration)",
        "PWM frequency: 20-45 kHz (center-aligned, complementary)",
        "MOSFETs: 6x CSD19535KCS (100V, 5 mΩ Rds(on), D2PAK)",
        "Gate driver: DRV8353SRTAR (100V, SPI configurable)",
        "Brake resistor: 33Ω / 35W, 25% max duty cycle"
    ],
    sheets: [
        { name: "EMI_Protection.kicad_sch", content: "DC input: XT60 connector, 20A fuse, SMCJ64A TVS, crowbar diode, pre-charge, bulk caps, CMC + differential inductor" },
        { name: "PowerTree.kicad_sch", content: "LM5164 (60V→12V buck), TPS7A2033 (ultra-low-noise 3.3V LDO), TPS563200 (5V), UVLO divider" },
        { name: "Inverter.kicad_sch", content: "3-phase half-bridge (6x CSD19535KCS), 3x 5 mΩ Kelvin shunts, bypass caps, snubber footprints (DNP), CM choke on motor output" },
        { name: "GateDriver.kicad_sch", content: "DRV8353SRTAR, bootstrap caps, gate resistors, SPI interface" },
        { name: "BrakeOVP.kicad_sch", content: "LM393 comparator, SCR latch, CSD19535KTT brake MOSFET, 33Ω/35W brake resistor" },
        { name: "STO_Safety.kicad_sch", content: "Safe Torque Off: 3-path disable (ENABLE + INH gating + GL clamp), test pulse, monitoring" }
    ],
    sections: [
        {
            id: "sec1",
            title: "Section 1: DC Input & EMI Protection",
            sheet: "EMI_Protection.kicad_sch",
            items: [
                { id: "1.1", check: "Input connector rated for max current", criterion: "XT60: >= 20A continuous at 60V", note: "" },
                { id: "1.2", check: "Fuse rating and breaking capacity", criterion: "20A fuse, breaking > max fault current", note: "" },
                { id: "1.3", check: "TVS standoff vs max operating voltage", criterion: "SMCJ64A: Vrwm=64V > 60V bus", note: "4V margin — verify acceptable for regen transients" },
                { id: "1.4", check: "TVS clamping voltage vs component abs-max", criterion: "SMCJ64A: Vc=103V @ Ipp; all 100V-rated parts survive?", note: "CSD19535KCS is 100V — 3V margin at surge" },
                { id: "1.5", check: "Reverse polarity protection", criterion: "Crowbar diode (D9, MBR30100CT) after fuse", note: "Verify diode triggers before sensitive components are damaged" },
                { id: "1.6", check: "Pre-charge / inrush limiting", criterion: "Pre-charge resistor + bypass switch for bulk cap charge", note: "Verify inrush < fuse I²t rating" },
                { id: "1.7", check: "Bulk capacitor voltage rating", criterion: "2x 2200µF/160V Panasonic EEU-FR2C222", note: "160V >> 60V bus — good margin" },
                { id: "1.8", check: "Bulk capacitor ripple current rating", criterion: "RMS ripple at 45 kHz PWM × 5A continuous", note: "Calculate worst-case ripple vs cap spec" },
                { id: "1.9", check: "Film capacitor for HF ripple", criterion: "2.2µF / 160V film cap close to bridge", note: "Verify ESR/ESL adequate for HF decoupling" },
                { id: "1.10", check: "Common-mode choke on DC input", criterion: "CMC in input path", note: "Verify impedance at target frequencies" },
                { id: "1.11", check: "Differential-mode inductor", criterion: "Present in input path", note: "Verify saturation current >= peak current" }
            ]
        },
        {
            id: "sec2",
            title: "Section 2: Power Supply Tree",
            sheet: "PowerTree.kicad_sch",
            items: [
                { id: "2.1", check: "HV buck input voltage range", criterion: "LM5164: rated to 100V, operating at 24-60V", note: "" },
                { id: "2.2", check: "HV buck output regulation", criterion: "12V ±2% at full load", note: "Check feedback divider values" },
                { id: "2.3", check: "HV buck switching frequency", criterion: "LM5164: 1.05 MHz internal", note: "Verify no overlap with PWM harmonics" },
                { id: "2.4", check: "HV buck soft-start", criterion: "Integrated in LM5164", note: "Verify no voltage overshoot at startup" },
                { id: "2.5", check: "HV buck output capacitance", criterion: "Sufficient for load transients and ripple spec", note: "Check ESR and total capacitance" },
                { id: "2.6", check: "UVLO on 12V rail", criterion: "Divider monitors 12V; prevents operation below minimum", note: "Verify trip point is above DRV8353 UVLO requirement" },
                { id: "2.7", check: "Analog LDO noise", criterion: "TPS7A2033: < 1 µVRMS (10 Hz - 100 kHz)", note: "Critical for ADC current sensing quality" },
                { id: "2.8", check: "Analog LDO PSRR", criterion: "TPS7A2033: > 70 dB at 1 MHz", note: "Must reject LM5164 switching ripple" },
                { id: "2.9", check: "Analog LDO thermal", criterion: "(12V - 3.3V) × I_load; verify SOT-23-5 is adequate", note: "Calculate max load current" },
                { id: "2.10", check: "Rail isolation (analog vs digital)", criterion: "Ferrite bead between +3V3_D and +3V3_A", note: "Verify ferrite impedance at target frequencies" },
                { id: "2.11", check: "ADC reference filtering", criterion: "R97=10Ω + decoupling on VREFHI", note: "Verify RC corner doesn't limit ADC sample settling" },
                { id: "2.12", check: "5V rail for encoder supply", criterion: "TPS563200, verify load regulation and noise", note: "Ferrite bead FB3 isolates encoder from digital noise" }
            ]
        },
        {
            id: "sec3",
            title: "Section 3: 3-Phase Inverter",
            sheet: "Inverter.kicad_sch",
            items: [
                { id: "3.1", check: "MOSFET Vds rating vs bus + regen", criterion: "CSD19535KCS: 100V >> 60V + regen headroom", note: "" },
                { id: "3.2", check: "MOSFET Rds(on) and conduction loss", criterion: "5 mΩ; P = 6 × 25 × 0.005 = 0.75W @ 5A", note: "Check Rds(on) at max Tj" },
                { id: "3.3", check: "MOSFET peak current capability", criterion: "Id_pulse at 15-20A for acceleration transients", note: "Verify SOA and pulse rating" },
                { id: "3.4", check: "MOSFET gate charge vs driver capability", criterion: "Qg vs DRV8353 source/sink current at target switching speed", note: "" },
                { id: "3.5", check: "MOSFET thermal pad and heatsinking", criterion: "D2PAK on copper pour; verify thermal resistance to ambient", note: "Calculate Tj at 15A peak for worst-case move" },
                { id: "3.6", check: "Bypass capacitor per half-bridge", criterion: "100nF/100V MLCC within 5mm of drain-source", note: "Verify voltage rating and dielectric (X7R minimum)" },
                { id: "3.7", check: "Snubber network footprints", criterion: "DNP RC snubbers across each half-bridge", note: "Verify component values are reasonable for tuning" },
                { id: "3.8", check: "Motor output CM choke", criterion: "L_CM1 (PDMFAT22148D-202MLB-6P, C3011552)", note: "Verify current rating >= 5A continuous, impedance at 100 kHz-10 MHz" },
                { id: "3.9", check: "Motor output RC snubbers", criterion: "6x RC pairs (4.7Ω + 2.2nF, DNP)", note: "Verify power dissipation if populated at 45 kHz" },
                { id: "3.10", check: "Motor connector rating", criterion: "3-phase output connector current/voltage", note: "" },
                { id: "3.11", check: "Shunt resistor value and power", criterion: "3x 5 mΩ, P = 15² × 0.005 = 1.125W peak", note: "Verify package power rating >= 2W" },
                { id: "3.12", check: "Shunt Kelvin sense routing", criterion: "4-wire connection from shunt pads to DRV8353 SPx/SNx", note: "CRITICAL: verify on schematic net connections" },
                { id: "3.13", check: "Shunt temperature coefficient", criterion: "< 50 ppm/°C for precision current sensing", note: "Check shunt resistor datasheet" },
                { id: "3.14", check: "Shunt inductance", criterion: "< 1 nH for switching-edge rejection", note: "4-terminal Kelvin design recommended" }
            ]
        },
        {
            id: "sec4",
            title: "Section 4: Gate Driver",
            sheet: "GateDriver.kicad_sch",
            items: [
                { id: "4.1", check: "DRV8353 voltage rating", criterion: "100V rated, operating at 24-60V bus", note: "" },
                { id: "4.2", check: "Bootstrap capacitor values", criterion: "Per TI reference design; verify sufficient for 45 kHz PWM", note: "Check bootstrap cap charge vs high-side on-time" },
                { id: "4.3", check: "Bootstrap diode (if external)", criterion: "Verify Vf and Trr compatible with bootstrap charging", note: "DRV8353 has internal bootstrap diodes" },
                { id: "4.4", check: "Gate resistor values", criterion: "Matched for target switching speed and EMI", note: "Verify slew rate vs EMC requirements" },
                { id: "4.5", check: "Dead-time configuration", criterion: "SPI configurable; verify minimum > body diode Trr", note: "" },
                { id: "4.6", check: "OCP (VDS monitoring) threshold", criterion: "SPI configurable; set above peak operating current", note: "Verify trip level protects MOSFETs" },
                { id: "4.7", check: "UVLO on VCC and bootstrap", criterion: "DRV8353 integrated; verify thresholds adequate", note: "" },
                { id: "4.8", check: "nFAULT output to MCU", criterion: "Connected to MCU GPIO, interrupt-capable", note: "" },
                { id: "4.9", check: "SPI interface to MCU", criterion: "CLK, MOSI, MISO, CS correctly routed", note: "" },
                { id: "4.10", check: "CSA input resistors", criterion: "R37/R38 = 22Ω per TI reference", note: "Verify compatibility with Kelvin shunt routing" },
                { id: "4.11", check: "CSA anti-alias RC filter", criterion: "100Ω + 2.2nF (fc = 723 kHz) per phase", note: "Verify fc > 2× current loop BW but < Nyquist/2" },
                { id: "4.12", check: "VCC decoupling", criterion: "Bypass caps per DRV8353 datasheet", note: "" },
                { id: "4.13", check: "DVDD decoupling", criterion: "Bypass caps per DRV8353 datasheet", note: "" },
                { id: "4.14", check: "VREF decoupling", criterion: "C19 = 1µF to AGND return", note: "TI datasheet requirement" },
                { id: "4.15", check: "ADS7056 fallback ADCs (DNP)", criterion: "U17/U18/U19 placed, SPI routed, DNP by default", note: "Verify SPI bus doesn't conflict when DNP" }
            ]
        },
        {
            id: "sec5",
            title: "Section 5: Brake Chopper & Overvoltage Protection",
            sheet: "BrakeOVP.kicad_sch",
            items: [
                { id: "5.1", check: "Threshold ordering", criterion: "Bus (60V) < TVS standoff (64V) < Brake ON (65.5V) < OVP (67.8V) < TVS breakdown (~71V)", note: "CRITICAL: verify all threshold values from divider calculations" },
                { id: "5.2", check: "LM393 comparator accuracy", criterion: "Verify offset and hysteresis vs threshold spacing", note: "" },
                { id: "5.3", check: "Brake threshold divider values", criterion: "Calculate actual trip point from resistor values", note: "Verify hysteresis (65.5V ON / 62.5V OFF)" },
                { id: "5.4", check: "OVP threshold divider values", criterion: "R64=442K; calculate actual trip point", note: "Target: 67.8V" },
                { id: "5.5", check: "SCR latch reliability", criterion: "Verify holding current, reset mechanism", note: "Reset via MCU GPIO through Q10 (MMBT3906)" },
                { id: "5.6", check: "Q10 base drive adequacy", criterion: "R88=4.7K provides sufficient Vbe drive through D13", note: "Changed from 10K to 4.7K to improve margin" },
                { id: "5.7", check: "Brake MOSFET rating", criterion: "CSD19535KTT: 100V, adequate for 60V bus", note: "" },
                { id: "5.8", check: "Brake resistor power budget", criterion: "35W @ 25% duty max; peak instantaneous = V²/R = 67.8²/33 = 139W", note: "CRITICAL: verify duty cycle assumption for your application" },
                { id: "5.9", check: "Brake resistor thermal mounting", criterion: "Must be mounted with adequate airflow/heatsinking", note: "PCB layout concern" },
                { id: "5.10", check: "Input filter capacitor", criterion: "10nF on comparator inputs to reject noise", note: "" },
                { id: "5.11", check: "Firmware-independence", criterion: "Brake/OVP must function without MCU intervention", note: "Verify all paths are hardware-only" }
            ]
        },
        {
            id: "sec6",
            title: "Section 6: Safe Torque Off (STO)",
            sheet: "STO_Safety.kicad_sch",
            items: [
                { id: "6.1", check: "Dual-channel redundancy", criterion: "3 independent disable paths (ENABLE, INH, GL clamp)", note: "IEC 61800-5-2 requires redundant paths" },
                { id: "6.2", check: "Path 1: ENABLE gating", criterion: "Verify ENABLE signal can independently disable gate drive", note: "" },
                { id: "6.3", check: "Path 2: INH gating", criterion: "AND gates (U7/U9/U13/U14) gate INH signals to DRV8353", note: "Verify logic levels and propagation delay" },
                { id: "6.4", check: "Path 3: GL clamp", criterion: "Q14/Q15/Q16 via U20 inverter clamp gate-low independently", note: "Verify clamp MOSFET Vgs threshold" },
                { id: "6.5", check: "Monitoring feedback", criterion: "GPIO39/GPIO40 read back STO state", note: "Verify MCU can detect discrepancy between channels" },
                { id: "6.6", check: "Test pulse capability", criterion: "GPIO30/GPIO31 can inject test pulses", note: "Verify test pulse does not cause motor torque" },
                { id: "6.7", check: "Response time", criterion: "Hardware gating < 1 ms", note: "Measure propagation through each path" },
                { id: "6.8", check: "Power supply independence", criterion: "STO must function if MCU is not running", note: "" },
                { id: "6.9", check: "External watchdog integration", criterion: "STWD100 (U22) + AND gate (U21) gates DRV_ENABLE", note: "WD timeout if MCU locks up" },
                { id: "6.10", check: "Safe state definition", criterion: "All paths disable = motor coasts (no active braking)", note: "Verify this is acceptable for your application" }
            ]
        },
        {
            id: "sec7",
            title: "Section 7: Thermal Design",
            sheet: "",
            items: [
                { id: "7.1", check: "MOSFET worst-case Tj", criterion: "Calculate at 15A peak, 45 kHz, max ambient", note: "" },
                { id: "7.2", check: "Shunt resistor worst-case temperature", criterion: "1.125W in 2512; verify temperature rise", note: "Affects current sensing accuracy via TCR" },
                { id: "7.3", check: "NTC placement near shunts", criterion: "TH1 (10K NTC B3435) mandatory, populated", note: "Critical for CSA thermal drift compensation" },
                { id: "7.4", check: "DRV8353 thermal management", criterion: "Verify exposed pad connected to ground pour", note: "" },
                { id: "7.5", check: "LM5164 thermal pad", criterion: "Verify thermal via array and copper pour", note: "PCB layout item" },
                { id: "7.6", check: "Brake resistor thermal isolation", criterion: "R95 (33Ω/35W) away from sensitive components", note: "PCB layout item" },
                { id: "7.7", check: "Worst-case ambient temperature", criterion: "Verify all components rated for max operating temp", note: "Check industrial temp range (-40 to +85°C) requirement" }
            ]
        },
        {
            id: "sec8",
            title: "Section 8: PCB Layout Concerns",
            sheet: "",
            items: [
                { id: "8.1", check: "High-current loop area minimization", criterion: "Bulk cap → FETs → shunt → return must be tight", note: "" },
                { id: "8.2", check: "Gate trace length", criterion: "< 20mm from DRV8353 to each MOSFET gate", note: "" },
                { id: "8.3", check: "Kelvin sense trace routing", criterion: "Differential pair from shunt pads to DRV8353, no shared current path", note: "" },
                { id: "8.4", check: "PGND copper pour", criterion: "Continuous under inverter, MOSFETs, shunts, bulk caps", note: "" },
                { id: "8.5", check: "Thermal via arrays", criterion: "Under MOSFET D2PAK pads and DRV8353 exposed pad", note: "" },
                { id: "8.6", check: "Motor connector proximity", criterion: "Close to CM choke output; short high-current traces", note: "" },
                { id: "8.7", check: "Brake resistor placement", criterion: "Thermally isolated from precision components", note: "" },
                { id: "8.8", check: "Star ground tie point", criterion: "R190 (0Ω) connects AGND/DGND near shunts", note: "" }
            ]
        }
    ]
};
