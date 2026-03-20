const SIGNAL_CHAIN_CHECKLIST = {
    title: "Signal Chain Reviewer Checklist",
    project: "ServoDriverTI v1.1",
    role: "Signal Chain, Analog, & Mixed-Signal Expert",
    dateIssued: "2026-03-20",
    instructions: "This checklist covers the current sensing signal chain, ADC interface, encoder interface, MCU analog configuration, communication interfaces, and control loop architecture of the ServoDriverTI servo drive. Please mark each item as PASS / FAIL / N/A and add comments where needed.",
    specs: [
        "Encoder: Incremental ABZ, 20 nm resolution, differential RS-422",
        "Current sensing: 3x 5 mΩ Kelvin shunt → DRV8353 CSA → RC filter → MCU 12-bit ADC",
        "MCU: TMS320F280049CPZS (C2000, 100 MHz, dual 12-bit ADC, eQEP, ePWM, hardware FPU/TMU)",
        "FOC current loop: 20-45 kHz (phase-synchronous ADC sampling at PWM midpoint)",
        "Velocity loop: 1-5 kHz (decimated from current ISR)",
        "Position loop: 0.5-2 kHz (decimated from current ISR)",
        "DC bus: 24-60V (nominal 48V)",
        "Continuous / peak current: 5A / 15-20A"
    ],
    sheets: [
        { name: "GateDriver.kicad_sch", content: "DRV8353SRTAR CSA configuration, anti-alias filters, ADS7056 fallback ADCs (DNP)" },
        { name: "MCU.kicad_sch", content: "TMS320F280049C, ADC inputs, PGA routing, ePWM outputs, eQEP, SPI, UART, CAN, NTC input, JTAG" },
        { name: "EncoderInterface.kicad_sch", content: "AM26LV32EIDR RS-422 receiver, termination, failsafe bias, ESD, ferrite bead" },
        { name: "Communications.kicad_sch", content: "CP2102N USB-UART bridge, ISO1044BD isolated CAN, TVS protection" },
        { name: "PowerTree.kicad_sch", content: "TPS7A2033 ultra-low-noise 3.3V LDO (analog rail), ferrite bead isolation" },
        { name: "Inverter.kicad_sch", content: "3x 5 mΩ Kelvin shunt resistors (current sensing source)" }
    ],
    sections: [
        {
            id: "sec1",
            title: "Section 1: Current Sensing Signal Chain (Most Critical)",
            sheet: "Shunt (Inverter) → Kelvin traces → DRV8353 CSA (GateDriver) → RC filter → MCU ADC (MCU)",
            subsections: [
                {
                    id: "sub1.1",
                    title: "1.1 Shunt Resistors",
                    items: [
                        { id: "1.1.1", check: "Shunt value vs SNR", criterion: "5 mΩ × 5A = 25 mV; 5 mΩ × 15A = 75 mV", note: "Verify signal level adequate for CSA input range" },
                        { id: "1.1.2", check: "Kelvin (4-wire) connection", criterion: "Sense pins separate from current-carrying pins to DRV8353 SPx/SNx", note: "CRITICAL for < 50 mV signal integrity" },
                        { id: "1.1.3", check: "Temperature coefficient", criterion: "< 50 ppm/°C metal strip element", note: "Contributes to thermal drift budget" },
                        { id: "1.1.4", check: "Parasitic inductance", criterion: "< 1 nH; 4-terminal design", note: "High L causes switching-edge voltage spikes" },
                        { id: "1.1.5", check: "Symmetric placement", criterion: "All 3 shunts physically matched for equal thermal environment", note: "PCB layout concern — flag for layout review" }
                    ]
                },
                {
                    id: "sub1.2",
                    title: "1.2 DRV8353 Current Sense Amplifiers",
                    items: [
                        { id: "1.2.1", check: "CSA gain setting", criterion: "Default 10 V/V; can be changed to 5/20/40 via SPI", note: "At 10 V/V: 50 mV/A sensitivity" },
                        { id: "1.2.2", check: "CSA bandwidth", criterion: "> 5× current loop frequency (> 225 kHz for 45 kHz loop)", note: "DRV8353 CSA BW > 1 MHz" },
                        { id: "1.2.3", check: "CSA input offset voltage", criterion: "±5 mV typical", note: "Calibrated at boot: 1024-sample average" },
                        { id: "1.2.4", check: "CSA offset thermal drift", criterion: "±15 µV/°C", note: "CRITICAL: ±450 µV (±9 mA) drift over 30°C swing" },
                        { id: "1.2.5", check: "CSA output bias", criterion: "1.65V (VREF/2)", note: "Must be accurately subtracted in firmware" },
                        { id: "1.2.6", check: "CSA input resistors", criterion: "R37/R38 = 22Ω per phase; per TI reference", note: "Verify matched values for all 3 phases" },
                        { id: "1.2.7", check: "CSA CMRR at switching frequency", criterion: "> 70 dB", note: "DRV8353 integrated CSA designed for this" },
                        { id: "1.2.8", check: "Gain accuracy", criterion: "±1% typical", note: "Verify this is within current loop tolerance" }
                    ]
                },
                {
                    id: "sub1.3",
                    title: "1.3 Anti-Alias Filtering",
                    items: [
                        { id: "1.3.1", check: "Filter topology", criterion: "Single-pole RC per phase", note: "100Ω + 2.2 nF" },
                        { id: "1.3.2", check: "Corner frequency", criterion: "fc = 1/(2πRC) = 723 kHz", note: "> 2× 45 kHz (loop BW); < 1.7 MHz (Nyquist/2)" },
                        { id: "1.3.3", check: "Capacitor type", criterion: "C0G/NP0 for low distortion and zero voltage coefficient", note: "C0G specified — verify on BOM" },
                        { id: "1.3.4", check: "Resistor tolerance", criterion: "< 1% for matched filtering across phases", note: "" },
                        { id: "1.3.5", check: "Additional MCU-side cap", criterion: "2.2 nF C0G at MCU ADC input pin", note: "Provides additional filtering at the ADC" },
                        { id: "1.3.6", check: "Source impedance vs ADC S/H", criterion: "100Ω + 2.2 nF settling time vs ADC acquisition window", note: "Verify time constant < ADC Tacq setting" }
                    ]
                },
                {
                    id: "sub1.4",
                    title: "1.4 ADC Configuration",
                    items: [
                        { id: "1.4.1", check: "ADC resolution", criterion: "12-bit (4096 counts over 3.3V)", note: "Raw current/LSB: 16.1 mA at 10 V/V gain" },
                        { id: "1.4.2", check: "Oversampling strategy", criterion: "16× burst → +2 effective bits → ~14-bit", note: "~4 mA/LSB effective resolution" },
                        { id: "1.4.3", check: "PGA configuration", criterion: "PGA1/3/5 connected to CSA outputs; PGA 3× clips (1.65V × 3 = 4.95V > 3.3V)", note: "PGA bypass is correct default; 3× only if CSA gain reduced" },
                        { id: "1.4.4", check: "PGA pin routing", criterion: "PGA1_IN (pin 18), PGA3_IN (pin 20), PGA5_IN (pin 16) connected to CSA_A/B/C", note: "Verify net connectivity on MCU schematic" },
                        { id: "1.4.5", check: "ADC trigger source", criterion: "ePWM SOCA/SOCB at PWM midpoint (center-aligned)", note: "Phase-synchronous sampling — verify trigger configuration" },
                        { id: "1.4.6", check: "ADC conversion time", criterion: "~0.3 µs per conversion; << 22 µs PWM period", note: "" },
                        { id: "1.4.7", check: "Dual ADC simultaneity", criterion: "ADCA and ADCB sample in parallel", note: "Verify phase allocation across ADC modules" },
                        { id: "1.4.8", check: "ADC reference (VREFHI)", criterion: "Filtered via R97=10Ω + decoupling caps", note: "Verify reference source is TPS7A2033 (< 1 µVRMS)" },
                        { id: "1.4.9", check: "VBUS voltage measurement", criterion: "Divider: R16=56.7K / R17=2.49K (ratio ~23.8:1)", note: "Calculate: 60V / 23.76 = 2.525V — within 3.3V range" },
                        { id: "1.4.10", check: "NTC temperature input", criterion: "TH1 (10K NTC B3435) + R96 (10K pullup) + C175 (100nF) → ADC C0/C2", note: "Mandatory for CSA thermal drift compensation" }
                    ]
                },
                {
                    id: "sub1.5",
                    title: "1.5 ADS7056 Fallback ADCs (DNP)",
                    items: [
                        { id: "1.5.1", check: "Part selection", criterion: "ADS7056IRUGR: 14-bit, 2.5 MSPS, X2QFN-8", note: "" },
                        { id: "1.5.2", check: "SPI interface", criterion: "Connected to SPIB (separate from DRV8353 SPIA)", note: "Verify no bus conflict when DNP" },
                        { id: "1.5.3", check: "Reference designators", criterion: "U17 (Phase A), U18 (Phase B), U19 (Phase C)", note: "All DNP by default" },
                        { id: "1.5.4", check: "Power supply", criterion: "AVDD and DVDD to +3V3_A", note: "" },
                        { id: "1.5.5", check: "Input connection", criterion: "CSA output → ADS7056 analog input", note: "Verify signal path doesn't degrade internal ADC path" },
                        { id: "1.5.6", check: "Population criteria", criterion: "Populate if 12-bit + oversampling proves insufficient at prototype", note: "Decision documented in DEC-001" }
                    ]
                }
            ],
            items: []
        },
        {
            id: "sec2",
            title: "Section 2: Encoder Interface",
            sheet: "EncoderInterface.kicad_sch",
            subsections: null,
            items: [
                { id: "2.1", check: "RS-422 receiver", criterion: "AM26LV32EIDR quad differential receiver", note: "" },
                { id: "2.2", check: "Common-mode input range", criterion: "AM26LV32: -7V to +12V", note: "Adequate for industrial encoder cables" },
                { id: "2.3", check: "Propagation delay", criterion: "~20 ns typical", note: "Verify << encoder edge period at max velocity" },
                { id: "2.4", check: "Channel-to-channel skew", criterion: "< 2 ns typical", note: "Critical for quadrature accuracy" },
                { id: "2.5", check: "Line termination", criterion: "120Ω DNP (populate for cables > 1m)", note: "Verify termination value matches cable impedance" },
                { id: "2.6", check: "Failsafe bias resistors", criterion: "R174-R179 = 1K (pull-up/pull-down)", note: "Defines output state on cable disconnect; 1K chosen to avoid excessive noise margin consumption" },
                { id: "2.7", check: "ESD protection", criterion: "Shunt diodes on A+/B+/Z+", note: "Verify clamp voltage < AM26LV32 abs-max input" },
                { id: "2.8", check: "Encoder supply filtering", criterion: "FB3 (120R@100MHz, 0805) on +5V supply", note: "Prevents encoder switching noise from coupling to analog section" },
                { id: "2.9", check: "MCU eQEP connections", criterion: "eQEP1A (GPIO20), eQEP1B (GPIO21), eQEP1I (GPIO99)", note: "Verify pin mux assignments are correct" },
                { id: "2.10", check: "Max count rate at peak velocity", criterion: "Verify edge rate at max velocity does not exceed eQEP input spec", note: "Calculate: velocity / (20 nm) × 4 (quadrature)" },
                { id: "2.11", check: "Index pulse (Z) handling", criterion: "Connected to eQEP1I for reference position", note: "" },
                { id: "2.12", check: "Connector pinout", criterion: "DB-9 or 10-pin, shield connection to chassis GND", note: "Verify shield grounding strategy" }
            ]
        },
        {
            id: "sec3",
            title: "Section 3: MCU Analog & Control Configuration",
            sheet: "MCU.kicad_sch",
            subsections: [
                {
                    id: "sub3.1",
                    title: "3.1 Clock & Reset",
                    items: [
                        { id: "3.1.1", check: "Crystal frequency", criterion: "10 MHz (X1)", note: "Verify PLL multiplier for 100 MHz SYSCLK" },
                        { id: "3.1.2", check: "Crystal load capacitors", criterion: "Matched to crystal specification", note: "" },
                        { id: "3.1.3", check: "Reset circuit", criterion: "Pull-up + decoupling on XRSn", note: "" },
                        { id: "3.1.4", check: "JTAG header", criterion: "14-pin TI standard", note: "Verify all signals (TDI, TDO, TMS, TCK, TRSTn, EMU0, EMU1)" },
                        { id: "3.1.5", check: "EMU pull-ups", criterion: "R67/R68 = 10K on EMU0/EMU1", note: "Required for debug isolation" }
                    ]
                },
                {
                    id: "sub3.2",
                    title: "3.2 ePWM Configuration",
                    items: [
                        { id: "3.2.1", check: "ePWM module assignment", criterion: "Verify each phase uses same-module H/L pair", note: "Cross-module assignment documented — requires firmware attention" },
                        { id: "3.2.2", check: "PWM output pin mapping", criterion: "INHA/INLA, INHB/INLB, INHC/INLC to DRV8353", note: "Verify GPIO mux settings match intended ePWM outputs" },
                        { id: "3.2.3", check: "Center-aligned PWM", criterion: "ePWM up-down count mode", note: "Required for midpoint ADC sampling" },
                        { id: "3.2.4", check: "HRPWM capability", criterion: "25.6 GHz effective timebase for low-current precision", note: "Critical for quiet position hold" },
                        { id: "3.2.5", check: "ADC SOC trigger", criterion: "ePWM event at PWM midpoint triggers ADC conversion", note: "Verify SOC configuration matches intended sampling instant" }
                    ]
                },
                {
                    id: "sub3.3",
                    title: "3.3 SPI Interface",
                    items: [
                        { id: "3.3.1", check: "SPIA to DRV8353", criterion: "CLK, SIMO, SOMI, STE correctly routed", note: "Verify pin assignments and clock polarity" },
                        { id: "3.3.2", check: "SPIB reserved for ADS7056", criterion: "CLK, SIMO, SOMI + 3 CS lines (GPIO for U17/U18/U19)", note: "Verify no conflict when ADS7056 are DNP" },
                        { id: "3.3.3", check: "SPI clock speed", criterion: "Adequate for DRV8353 config and ADS7056 readout", note: "DRV8353: up to 10 MHz; ADS7056: up to 60 MHz" }
                    ]
                },
                {
                    id: "sub3.4",
                    title: "3.4 Ground Domains",
                    items: [
                        { id: "3.4.1", check: "AGND / DGND / PGND separation", criterion: "Three distinct net names in schematic", note: "" },
                        { id: "3.4.2", check: "Single-point tie", criterion: "R190 (0Ω) between AGND and DGND on MCU sheet", note: "Verify location is near ADC reference / shunt return" },
                        { id: "3.4.3", check: "Analog ground pour", criterion: "AGND under ADC inputs, VREFHI, PGA pins", note: "PCB layout concern — flag for review" },
                        { id: "3.4.4", check: "PGA ground pins", criterion: "PGA1_GND (pin 14), PGA3_GND (pin 15), PGA5_GND (pin 13) connected to AGND", note: "Verify net assignment" }
                    ]
                }
            ],
            items: []
        },
        {
            id: "sec4",
            title: "Section 4: Communication Interfaces",
            sheet: "Communications.kicad_sch",
            subsections: [
                {
                    id: "sub4.1",
                    title: "4.1 USB-UART (Debug/Command)",
                    items: [
                        { id: "4.1.1", check: "Bridge IC", criterion: "CP2102N-A02-GQFN28R", note: "" },
                        { id: "4.1.2", check: "USB signal integrity", criterion: "22Ω series damping on D+/D- (R172/R173, 0402)", note: "" },
                        { id: "4.1.3", check: "USB ESD protection", criterion: "TVS clamps on D+/D-", note: "" },
                        { id: "4.1.4", check: "VBUS detection", criterion: "Divider R47=47.5K / R48=22.1K", note: "Verify threshold for USB cable detect" },
                        { id: "4.1.5", check: "TX/RX crossover", criterion: "CP2102N TXD → MCU UART_RX; CP2102N RXD → MCU UART_TX", note: "Verify correct crossover" },
                        { id: "4.1.6", check: "Self-powered config", criterion: "VDD/VREGIN tied to +3V3_D (not USB VBUS)", note: "" },
                        { id: "4.1.7", check: "Shield coupling", criterion: "100nF ∥ 1M to DGND", note: "" }
                    ]
                },
                {
                    id: "sub4.2",
                    title: "4.2 CAN (Industrial)",
                    items: [
                        { id: "4.2.1", check: "Isolated CAN transceiver", criterion: "ISO1044BD (primary, isolated)", note: "" },
                        { id: "4.2.2", check: "Isolated power supply", criterion: "IA0305S (3.3V → 5V isolated DC/DC)", note: "Verify isolation voltage rating" },
                        { id: "4.2.3", check: "Legacy non-isolated path", criterion: "SN65HVD232DR (U5) DNP backup", note: "Verify no conflict with ISO1044BD" },
                        { id: "4.2.4", check: "CAN TVS protection", criterion: "D7/D8 = PESD12VF1BSF", note: "Changed from PESD24VF1BSF — verify clamp vs transceiver abs-max" },
                        { id: "4.2.5", check: "CAN CMC", criterion: "L3 for EMC compliance", note: "" },
                        { id: "4.2.6", check: "Bus termination", criterion: "120Ω DNP (populate if end-of-bus)", note: "" },
                        { id: "4.2.7", check: "CAN bus side bulk cap", criterion: "C200 (4.7µF, 0805)", note: "" }
                    ]
                }
            ],
            items: []
        },
        {
            id: "sec5",
            title: "Section 5: Error Budget Verification",
            sheet: "",
            subsections: null,
            items: [
                { id: "5.1", check: "ADC current resolution (raw 12-bit)", criterion: "3.3V/4096 / (5 mΩ × 10 V/V) = 16.1 mA/LSB", note: "Verify calculation" },
                { id: "5.2", check: "ADC current resolution (16× OS)", criterion: "16.1 mA / 4 = ~4 mA/LSB", note: "Verify oversampling gain assumption (+2 bits)" },
                { id: "5.3", check: "Encoder quantization", criterion: "20 nm / 2 = ±10 nm half-count", note: "Fixed by encoder resolution" },
                { id: "5.4", check: "CSA thermal drift (30°C)", criterion: "±15 µV/°C × 30°C = ±450 µV → ±9 mA at 50 mV/A", note: "Dominant error source. NTC mitigation target: ±2-3 mA" },
                { id: "5.5", check: "PWM current ripple", criterion: "Vbus / (2 × L_motor × f_PWM)", note: "Motor inductance dependent. Verify ripple is acceptable." },
                { id: "5.6", check: "Power supply noise floor", criterion: "TPS7A2033: < 1 µVRMS → < 0.02 mA equivalent", note: "Verify PSRR at switching frequencies" },
                { id: "5.7", check: "ADS7056 fallback resolution", criterion: "3.3V/16384 / (5 mΩ × 20 V/V) = ~2 mA/LSB", note: "DNP by default. Population criteria documented in DEC-001" }
            ]
        },
        {
            id: "sec6",
            title: "Section 6: Control Architecture Review",
            sheet: "",
            subsections: null,
            items: [
                { id: "6.1", check: "Phase-synchronous sampling", criterion: "ADC triggered by ePWM at PWM midpoint", note: "Eliminates switching noise in current measurement" },
                { id: "6.2", check: "3-shunt topology", criterion: "All 3 phase currents measured independently", note: "Avoids reconstruction artifacts" },
                { id: "6.3", check: "Current loop bandwidth", criterion: "Hardware supports 20-45 kHz update rate", note: "ADC speed, ISR budget adequate" },
                { id: "6.4", check: "HRPWM for position hold", criterion: "25.6 GHz effective PWM resolution", note: "Eliminates duty-cycle quantization at low current" },
                { id: "6.5", check: "Cascaded loop decimation", criterion: "Current → velocity → position loop rates independent", note: "Verify MCU has CPU bandwidth for all loops" },
                { id: "6.6", check: "Boot offset calibration", criterion: "1024-sample CSA offset average at boot (motor not driven)", note: "Verify ADC input has stable bias when motor is off" },
                { id: "6.7", check: "Watchdog kick in control ISR", criterion: "GPIO12 toggle must occur every ISR period", note: "STWD100 timeout vs ISR period compatibility" },
                { id: "6.8", check: "Fault detection path", criterion: "DRV8353 nFAULT → MCU GPIO (interrupt capable)", note: "Verify ISR can read fault within 1 PWM period" }
            ]
        }
    ]
};
