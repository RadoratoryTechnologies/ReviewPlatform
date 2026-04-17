const SIGNAL_CHAIN_CHECKLIST = {
    title: "Signal Chain Reviewer Checklist",
    project: "ServoTIv1",
    role: "Signal Chain, Analog, & Mixed-Signal Expert",
    dateIssued: "2026-04-17",
    instructions: "This checklist covers the current sensing signal chain, ADC interface, encoder interface, MCU analog configuration, communication interfaces, digital I/O signal path, and control loop architecture of the ServoTIv1 servo drive. Please mark each item as PASS / FAIL / N/A and add comments where needed.",
    specs: [
        "Encoder: Incremental ABZ, 20 nm resolution, differential RS-422",
        "Current sensing: 3x 5 mOhm Kelvin shunt -> DRV8353 CSA -> RC filter -> MCU 12-bit ADC",
        "MCU: TMS320F280049CPZS (C2000, 100 MHz, dual 12-bit ADC, eQEP, ePWM, hardware FPU/TMU)",
        "FOC current loop: 20-45 kHz (phase-synchronous ADC sampling at PWM midpoint)",
        "Velocity loop: 1 kHz (decimated from current ISR)",
        "Position loop: 0.5-2 kHz (decimated from current ISR)",
        "DC bus: 24-60V (nominal 48V)",
        "Continuous / peak current: 5A / 15-20A",
        "Position error target: +/-20 nm"
    ],
    sheets: [
        { name: "GateDriver.kicad_sch", content: "DRV8353SRTAT CSA configuration, anti-alias filters, ADS7056 fallback ADCs (DNP)" },
        { name: "MCU.kicad_sch", content: "TMS320F280049C, ADC inputs (current + rail monitoring + brake/OVP), PGA routing, ePWM outputs, eQEP, SPI, UART, CAN, NTC inputs, JTAG (TI-14)" },
        { name: "EncoderInterface.kicad_sch", content: "AM26LV32EIDR RS-422 receiver, termination/failsafe bias, Hall Schmitt buffers (SN74LVC1G17), ESD, ferrite bead" },
        { name: "Communications.kicad_sch", content: "CP2102N USB-UART, MAX3232 RS-232 (RX source select R297/R298), ISO1044BD isolated CAN, TVS protection" },
        { name: "DigitalIO.kicad_sch", content: "6x 6N137S optocouplers, B0503S-1WR3 field isolation, STEP/DIR pulse inputs (AIO -> CLB), limit switches (AIO -> TZ), motor NTC (J13)" },
        { name: "Inverter.kicad_sch", content: "3x 5 mOhm Kelvin shunt resistors (current sensing source)" }
    ],
    sections: [
        {
            id: "sec1",
            title: "Section 1: Current Sensing Signal Chain (Most Critical)",
            sheet: "Shunt (Inverter) -> Kelvin traces -> DRV8353 CSA (GateDriver) -> RC filter -> MCU ADC (MCU)",
            subsections: [
                {
                    id: "sub1.1",
                    title: "1.1 Shunt Resistors",
                    items: [
                        { id: "1.1.1", check: "Shunt value vs SNR", criterion: "5 mOhm x 5A = 25 mV; 5 mOhm x 15A = 75 mV", note: "Verify signal level adequate for CSA input range" },
                        { id: "1.1.2", check: "Kelvin (4-wire) connection", criterion: "SH_A+/-, SH_B+/-, SH_C+/- separate from current-carrying pins to DRV8353 SPx/SNx", note: "CRITICAL for < 50 mV signal integrity. All 6 sense lines in Analog net class." },
                        { id: "1.1.3", check: "Temperature coefficient", criterion: "< 50 ppm/C metal strip element", note: "Contributes to thermal drift budget" },
                        { id: "1.1.4", check: "Parasitic inductance", criterion: "< 1 nH; 4-terminal design", note: "High L causes switching-edge voltage spikes" },
                        { id: "1.1.5", check: "Symmetric placement", criterion: "All 3 shunts physically matched for equal thermal environment", note: "PCB layout concern" }
                    ]
                },
                {
                    id: "sub1.2",
                    title: "1.2 DRV8353 Current Sense Amplifiers",
                    items: [
                        { id: "1.2.1", check: "CSA gain setting", criterion: "Default 10 V/V; can be changed to 5/20/40 via SPI", note: "At 10 V/V: 50 mV/A sensitivity" },
                        { id: "1.2.2", check: "CSA bandwidth", criterion: "> 5x current loop frequency (> 225 kHz for 45 kHz loop)", note: "DRV8353 CSA BW > 1 MHz" },
                        { id: "1.2.3", check: "CSA input offset voltage", criterion: "+/-5 mV typical", note: "Calibrated at boot: 1024-sample average" },
                        { id: "1.2.4", check: "CSA offset thermal drift", criterion: "+/-15 uV/C", note: "CRITICAL: +/-450 uV (+/-9 mA) drift over 30C swing. Dominant error source." },
                        { id: "1.2.5", check: "CSA output bias", criterion: "1.65V (VREF/2)", note: "Must be accurately subtracted in firmware" },
                        { id: "1.2.6", check: "CSA input resistors", criterion: "R37/R38 = 22R per phase; per TI reference", note: "Verify matched values for all 3 phases" },
                        { id: "1.2.7", check: "CSA CMRR at switching frequency", criterion: "> 70 dB", note: "DRV8353 integrated CSA designed for this" },
                        { id: "1.2.8", check: "Gain accuracy", criterion: "+/-1% typical", note: "Verify this is within current loop tolerance" }
                    ]
                },
                {
                    id: "sub1.3",
                    title: "1.3 Anti-Alias Filtering",
                    items: [
                        { id: "1.3.1", check: "Filter topology", criterion: "Single-pole RC per phase", note: "100R + 2.2 nF" },
                        { id: "1.3.2", check: "Corner frequency", criterion: "fc = 1/(2*pi*RC) = 723 kHz", note: "> 2x 45 kHz (loop BW); < 1.7 MHz (Nyquist/2)" },
                        { id: "1.3.3", check: "Capacitor type", criterion: "C0G/NP0 for low distortion and zero voltage coefficient", note: "C0G specified. X7R would create voltage-dependent filter corners." },
                        { id: "1.3.4", check: "Resistor tolerance", criterion: "< 1% for matched filtering across phases", note: "" },
                        { id: "1.3.5", check: "Additional MCU-side cap", criterion: "2.2 nF C0G at MCU ADC input pin", note: "Provides additional filtering at the ADC" },
                        { id: "1.3.6", check: "Source impedance vs ADC S/H", criterion: "100R + 2.2 nF settling time vs ADC acquisition window", note: "Time constant 220 ns, 5*tau = 1.1 us. Verify vs ADC Tacq setting." }
                    ]
                },
                {
                    id: "sub1.4",
                    title: "1.4 ADC Configuration",
                    items: [
                        { id: "1.4.1", check: "ADC resolution", criterion: "12-bit (4096 counts over 3.3V)", note: "Raw current/LSB: 16.1 mA at 10 V/V gain. Effective ~2 nm after loop filtering." },
                        { id: "1.4.2", check: "Oversampling strategy", criterion: "16x burst -> +2 effective bits -> ~14-bit", note: "~4 mA/LSB effective. Requires analog noise >= 1/2 LSB for dithering." },
                        { id: "1.4.3", check: "PGA configuration", criterion: "PGA1/3/5 connected to CSA outputs; PGA 3x clips (1.65V x 3 = 4.95V > 3.3V)", note: "PGA bypass is correct default; 3x only if CSA gain reduced" },
                        { id: "1.4.4", check: "PGA pin routing", criterion: "PGA1_IN (pin 18), PGA3_IN (pin 20), PGA5_IN (pin 16) connected to CSA_A/B/C", note: "Verify net connectivity on MCU schematic" },
                        { id: "1.4.5", check: "ADC trigger source", criterion: "ePWM SOCA/SOCB at PWM midpoint (center-aligned)", note: "Phase-synchronous sampling eliminates switching noise" },
                        { id: "1.4.6", check: "ADC conversion time", criterion: "~0.3 us per conversion; << 22 us PWM period", note: "" },
                        { id: "1.4.7", check: "Dual ADC simultaneity", criterion: "ADCA and ADCB sample in parallel", note: "Verify phase allocation across ADC modules" },
                        { id: "1.4.8", check: "ADC reference (VREFHI)", criterion: "Filtered via R97=10R + decoupling caps", note: "CRITICAL: VREFHI bypass quality affects low-freq noise that is NOT filtered by position loop." },
                        { id: "1.4.9", check: "VBUS voltage measurement", criterion: "Divider: R16=56.7K / R17=2.49K (ratio ~23.8:1)", note: "Calculate: 60V / 23.76 = 2.525V — within 3.3V range" },
                        { id: "1.4.10", check: "NTC temperature inputs", criterion: "TH1 (10K NTC B3435, on-board) + motor NTC via J13 -> ADC A5 (motor_temp)", note: "TH1 mandatory for CSA drift compensation. J13 for external motor NTC." }
                    ]
                },
                {
                    id: "sub1.5",
                    title: "1.5 ADS7056 Fallback ADCs (DNP)",
                    items: [
                        { id: "1.5.1", check: "Part selection", criterion: "ADS7056IRUGR: 14-bit, 2.5 MSPS, X2QFN-8", note: "" },
                        { id: "1.5.2", check: "SPI interface", criterion: "Connected to SPI-B (separate from DRV8353 SPI-A)", note: "Verify no bus conflict when DNP" },
                        { id: "1.5.3", check: "Reference designators", criterion: "U17 (Phase A), U18 (Phase B), U19 (Phase C)", note: "All DNP by default" },
                        { id: "1.5.4", check: "Power supply", criterion: "AVDD and DVDD to +3V3_A", note: "" },
                        { id: "1.5.5", check: "Input connection", criterion: "CSA output -> ADS7056 analog input", note: "Verify signal path doesn't degrade internal ADC path" },
                        { id: "1.5.6", check: "Population criteria", criterion: "Populate if 12-bit + oversampling proves insufficient at prototype", note: "Decision documented in DEC-001. 14-bit gives ~4 nm raw -> ~1 nm effective." }
                    ]
                }
            ],
            items: []
        },
        {
            id: "sec2",
            title: "Section 2: Encoder Interface",
            sheet: "EncoderInterface.kicad_sch",
            subsections: [
                {
                    id: "sub2.1",
                    title: "2.1 Differential Encoder (RS-422)",
                    items: [
                        { id: "2.1.1", check: "RS-422 receiver", criterion: "AM26LV32EIDR (U3, C527448) quad differential receiver", note: "NOT AM26C32. Has built-in open-circuit failsafe." },
                        { id: "2.1.2", check: "Common-mode input range", criterion: "AM26LV32: -7V to +12V", note: "Adequate for industrial encoder cables" },
                        { id: "2.1.3", check: "Propagation delay", criterion: "~20 ns typical", note: "Verify << encoder edge period at max velocity" },
                        { id: "2.1.4", check: "Channel-to-channel skew", criterion: "< 2 ns typical", note: "Critical for quadrature accuracy" },
                        { id: "2.1.5", check: "Line termination", criterion: "R21-R23 = 120R per ABZ pair (DNP, populate for cables > 1m)", note: "Verify termination value matches cable impedance" },
                        { id: "2.1.6", check: "Failsafe bias resistors", criterion: "R174-R179 = 1K pull-up/pull-down per ABZ pair", note: "With 3.3V, 1K/1K bias + 120R term: VID ~187 mV. Optional: reduce to 820R for more margin." },
                        { id: "2.1.7", check: "ESD protection", criterion: "Shunt diodes on A+/B+/Z+", note: "Verify clamp voltage < AM26LV32 abs-max input" },
                        { id: "2.1.8", check: "Encoder supply filtering", criterion: "FB3 (120R@100MHz, 0805) on +5V supply", note: "Prevents encoder switching noise from coupling to analog section" },
                        { id: "2.1.9", check: "Encoder connector", criterion: "J4: differential encoder connector", note: "TP1 shield drain pad on GND_CHASSIS nearby" }
                    ]
                },
                {
                    id: "sub2.2",
                    title: "2.2 Single-Ended Encoder",
                    items: [
                        { id: "2.2.1", check: "Single-ended connector", criterion: "J14: direct EQEP_A/B/I + 5V + GND + 3V3_D", note: "Dual-supply option for unknown encoder voltage" },
                        { id: "2.2.2", check: "Separate from differential path", criterion: "J14 is independent of J4/AM26LV32 path", note: "Hall path on J8 also separate" }
                    ]
                },
                {
                    id: "sub2.3",
                    title: "2.3 Hall Sensor Interface",
                    items: [
                        { id: "2.3.1", check: "Hall pull-ups for disconnect detection", criterion: "R194-R196 = 10K to +3V3_D on HALL_U/V/W_RAW", note: "Cable removal -> 111 (illegal state -> fault)" },
                        { id: "2.3.2", check: "Hall Schmitt buffers", criterion: "U24-U26 (SN74LVC1G17) after pull-ups on HALL_U/V/W", note: "Clean digital edges for commutation. Verify hysteresis adequate." },
                        { id: "2.3.3", check: "Hall connector", criterion: "J8: Hall U/V/W + power + GND", note: "TP2 shield drain pad on GND_CHASSIS nearby" }
                    ]
                },
                {
                    id: "sub2.4",
                    title: "2.4 eQEP Configuration",
                    items: [
                        { id: "2.4.1", check: "MCU eQEP connections", criterion: "eQEP1A (GPIO20), eQEP1B (GPIO21), eQEP1I (GPIO99)", note: "Verify pin mux assignments are correct" },
                        { id: "2.4.2", check: "Max count rate at peak velocity", criterion: "Verify edge rate at max velocity does not exceed eQEP input spec", note: "Calculate: velocity / (20 nm) x 4 (quadrature)" },
                        { id: "2.4.3", check: "Index pulse (Z) handling", criterion: "Connected to eQEP1I for reference position", note: "Bootstrap from Hall, first-index sync in firmware" }
                    ]
                }
            ],
            items: []
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
                        { id: "3.1.4", check: "JTAG header", criterion: "J3: TI-14 per F280049C datasheet Fig 6-26", note: "Shrouded keyed 2x7 0.1\" IDC box header (C11215). NOT cTI-20." },
                        { id: "3.1.5", check: "JTAG pin map (per Fig 6-26)", criterion: "Pin 1=TMS (R119=2.2K), 3=TDI (R117=10K), 5=PD (R118=100R + C37=100nF), 7=TDO (R116=10K), 9=RTCK (tied to pin 11 TCK), 13=EMU0 (R67=2.2K), 14=EMU1 (R68=2.2K)", note: "F280049C has NO TRSTn -> pin 2 NC. Pin 6 KEY (shrouded). Fig 6-26 shows ONE pullup per signal." },
                        { id: "3.1.6", check: "EMU0/EMU1 pull-ups", criterion: "R67/R68 = 2.2K to +3V3_D", note: "F280049C datasheet Sec 6.9.5: 2.2K-4.7K range, typically 2.2K. Correct as-built." },
                        { id: "3.1.7", check: "JTAG trace length constraint", criterion: "J3 <= 6 inches (15.24 cm) from MCU JTAG pins", note: "Per Fig 6-26. If exceeded, add buffers." }
                    ]
                },
                {
                    id: "sub3.2",
                    title: "3.2 ePWM Configuration",
                    items: [
                        { id: "3.2.1", check: "ePWM module assignment", criterion: "ePWM1/2/3 for 3-phase: each phase uses same-module H/L pair", note: "" },
                        { id: "3.2.2", check: "PWM output pin mapping", criterion: "INHA/INLA, INHB/INLB, INHC/INLC to DRV8353", note: "Verify GPIO mux settings match intended ePWM outputs" },
                        { id: "3.2.3", check: "Center-aligned PWM", criterion: "ePWM up-down count mode", note: "Required for midpoint ADC sampling" },
                        { id: "3.2.4", check: "HRPWM capability", criterion: "25.6 GHz effective timebase for low-current precision", note: "Critical for quiet position hold at +/-20 nm" },
                        { id: "3.2.5", check: "ADC SOC trigger", criterion: "ePWM event at PWM midpoint triggers ADC conversion", note: "Verify SOC configuration matches intended sampling instant" }
                    ]
                },
                {
                    id: "sub3.3",
                    title: "3.3 SPI Interface",
                    items: [
                        { id: "3.3.1", check: "SPI-A to DRV8353", criterion: "GPIO58 (CLK), GPIO56 (MOSI), GPIO57 (MISO), GPIO59 (CS)", note: "SPI mode 1, 1 MHz. Verify clock polarity." },
                        { id: "3.3.2", check: "SPI-B reserved for ADS7056", criterion: "CLK, SIMO, SOMI + 3 CS lines (GPIO for U17/U18/U19)", note: "GPIO24 = SPIB_SOMI (dual-purpose with boot mode, firmware mux). Verify no conflict when DNP." },
                        { id: "3.3.3", check: "SPI clock speed", criterion: "Adequate for DRV8353 config and ADS7056 readout", note: "DRV8353: up to 10 MHz; ADS7056: up to 60 MHz" }
                    ]
                },
                {
                    id: "sub3.4",
                    title: "3.4 Ground Domains",
                    items: [
                        { id: "3.4.1", check: "AGND / DGND / PGND separation", criterion: "Three distinct net names in schematic + GND_CHASSIS + FIELD_GND + CAN_ISO_GND", note: "6 ground domains total" },
                        { id: "3.4.2", check: "Single-point tie", criterion: "R190 (0R) AGND->DGND, R50 (0R) DGND->PGND, R218 (0R) PGND->GND_CHASSIS", note: "R51 (AGND->PGND) = DNP debug-only bridge (creates ground loop if populated)" },
                        { id: "3.4.3", check: "Analog ground pour", criterion: "AGND under ADC inputs, VREFHI, PGA pins", note: "PCB layout concern" },
                        { id: "3.4.4", check: "PGA ground pins", criterion: "PGA1_GND (pin 14), PGA3_GND (pin 15), PGA5_GND (pin 13) connected to AGND", note: "Verify net assignment" }
                    ]
                },
                {
                    id: "sub3.5",
                    title: "3.5 ADC Monitoring Channels (ECO-027/C4-H3)",
                    items: [
                        { id: "3.5.1", check: "PGOOD_12V monitoring", criterion: "LM5164 PGOOD (pin 6, open-drain) + R213 (10K pull-up) -> ADCINA4 (pin 36)", note: "Digital flag: 3.3V = good, 0V = fault. Read as 1-bit threshold." },
                        { id: "3.5.2", check: "VSENSE_5V monitoring", criterion: "R214/R215 10K/10K divider from +5V -> ADCINA8 (pin 37), ~2.5V nominal", note: "Slow DC, firmware averaging adequate" },
                        { id: "3.5.3", check: "VSENSE_3V3 monitoring", criterion: "R216/R217 10K/10K divider from +3V3_D -> ADCINB4 (pin 39), ~1.65V nominal", note: "Slow DC, firmware averaging adequate" },
                        { id: "3.5.4", check: "OVP_STATUS readback", criterion: "OVP_STATUS via R296 (1K series) -> ADCINA9 (pin 38)", note: "Digital flag from BrakeOVP SCR latch" },
                        { id: "3.5.5", check: "BRAKE_ACTIVE readback", criterion: "BRAKE_OUT -> R301/R300/C221 divider -> ADCINA2 (pin 9), ~2.98V when active", note: "Brake comparator state" },
                        { id: "3.5.6", check: "ADC source impedance for monitoring channels", criterion: "10K dividers with no buffer; verify F280049C Rs(max) at default ACQPS", note: "If Rs(max) < 5K, lower dividers from 10K/10K to 1K/1K (no caps, no buffer needed)" }
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
                        { id: "4.1.1", check: "Bridge IC", criterion: "CP2102N-A02-GQFN28R (U4)", note: "" },
                        { id: "4.1.2", check: "USB signal integrity", criterion: "22R series damping on D+/D- (R172/R173, 0402)", note: "" },
                        { id: "4.1.3", check: "USB ESD protection", criterion: "TVS clamps on D+/D-", note: "" },
                        { id: "4.1.4", check: "VBUS detection", criterion: "Divider R47=47.5K / R48=22.1K", note: "Verify threshold for USB cable detect" },
                        { id: "4.1.5", check: "TX/RX crossover", criterion: "CP2102N TXD -> MCU UART_RX; CP2102N RXD -> MCU UART_TX", note: "RX shared with RS-232 via R297/R298 jumper" },
                        { id: "4.1.6", check: "Self-powered config", criterion: "VDD/VREGIN tied to +3V3_D (not USB VBUS)", note: "" },
                        { id: "4.1.7", check: "Shield coupling", criterion: "100nF || 1M to DGND", note: "" }
                    ]
                },
                {
                    id: "sub4.2",
                    title: "4.2 RS-232 (Industrial/Legacy)",
                    items: [
                        { id: "4.2.1", check: "Transceiver", criterion: "MAX3232 (U33, TSSOP-16), 3.3V powered from +3V3_D", note: "" },
                        { id: "4.2.2", check: "TX path sharing", criterion: "MCU UART_TX -> CP2102 RXD + MAX3232 T1IN simultaneously", note: "Both are high-Z inputs — safe to share" },
                        { id: "4.2.3", check: "RX source select", criterion: "R297 (0R, populated = USB) / R298 (0R, DNP = RS-232) mutually exclusive at UART_RX", note: "CRITICAL: R297 and R298 must NEVER both be populated (output contention)" },
                        { id: "4.2.4", check: "Charge pump capacitors", criterion: "C212-C215 (100nF 0603): C1+/C1-, C2+/C2-, VS+/GND, VS-/GND. C216 VCC bypass.", note: "Per MAX3232 datasheet" },
                        { id: "4.2.5", check: "ESD protection", criterion: "D182/D183 (PESD24VL1BA, 24V bidirectional) on RS232_TX/RS232_RX", note: "" },
                        { id: "4.2.6", check: "Connector", criterion: "J17 (Phoenix MCV 3-pin P3.50mm): pin 1 TX, pin 2 RX, pin 3 GND", note: "" },
                        { id: "4.2.7", check: "Unused channel", criterion: "MAX3232 T2IN/R2OUT properly terminated (no-connect or tied)", note: "" }
                    ]
                },
                {
                    id: "sub4.3",
                    title: "4.3 CAN (Industrial)",
                    items: [
                        { id: "4.3.1", check: "Isolated CAN transceiver", criterion: "ISO1044BD (U23, primary, isolated, 1000VDC)", note: "CAN FD capable (up to 8 Mbps data phase)" },
                        { id: "4.3.2", check: "Isolated power supply", criterion: "IA0505S (5V -> 5V isolated DC/DC)", note: "Verify isolation voltage rating" },
                        { id: "4.3.3", check: "Legacy non-isolated path", criterion: "SN65HVD232DR (U5) DNP backup", note: "Verify no conflict with ISO1044BD" },
                        { id: "4.3.4", check: "CAN TVS protection", criterion: "D7/D8 = PESD12VL1BA (12V) on CANH/CANL", note: "Verify clamp vs transceiver abs-max" },
                        { id: "4.3.5", check: "CAN CMC", criterion: "Common-mode choke on CAN bus lines", note: "" },
                        { id: "4.3.6", check: "Bus termination", criterion: "R182 (120R) populated", note: "Remove if not end-of-bus" },
                        { id: "4.3.7", check: "CAN bus side bulk cap", criterion: "C200 (4.7uF, 0805)", note: "" },
                        { id: "4.3.8", check: "MCU CAN pins", criterion: "GPIO32 (CAN_TX, MUX=6), GPIO33 (CAN_RX, MUX=6)", note: "GPIO33 is CAN_RX — NOT available for SPI CS" }
                    ]
                }
            ],
            items: []
        },
        {
            id: "sec5",
            title: "Section 5: Digital I/O Signal Path",
            sheet: "DigitalIO.kicad_sch + MCU.kicad_sch",
            subsections: [
                {
                    id: "sub5.1",
                    title: "5.1 Pulse Command Inputs (STEP/DIR)",
                    items: [
                        { id: "5.1.1", check: "STEP input path", criterion: "6N137 U31 -> MCU A1/AIO232 (pin 22). No internal cap.", note: "Clean for high-freq pulses. >1 MHz target." },
                        { id: "5.1.2", check: "DIR input path", criterion: "6N137 U32 -> MCU B3/AIO242 (pin 8). 100pF internal cap to VSSA.", note: "OK for slow-changing direction signal" },
                        { id: "5.1.3", check: "CLB routing", criterion: "GPHAMSEL -> Input X-BAR -> CLB tile (QepOnClb): STEP=clock, DIR=direction, 32-bit counter", note: "NOT eQEP3 (F280049C only has 2 eQEP modules)" },
                        { id: "5.1.4", check: "No debounce caps", criterion: "C131/C132 removed (pulse-optimized)", note: "Verify clean signal integrity at target frequency" },
                        { id: "5.1.5", check: "Isolation domain (ECO-031a)", criterion: "U31/U32 LED VCC = FIELD_VCC, EN pins = +3V3_D", note: "ECO-031a corrected original domain swap" }
                    ]
                },
                {
                    id: "sub5.2",
                    title: "5.2 Limit Switch & Home Inputs",
                    items: [
                        { id: "5.2.1", check: "LIMIT_SW_A path", criterion: "6N137 opto -> C4/AIO239 (pin 17) -> Input X-BAR -> TZ + XINT1", note: "Hardware trip zone: PWM shutdown < 1 cycle" },
                        { id: "5.2.2", check: "LIMIT_SW_B path", criterion: "6N137 opto -> C1/AIO238 (pin 29) -> Input X-BAR -> TZ + XINT2", note: "Hardware trip zone: PWM shutdown < 1 cycle" },
                        { id: "5.2.3", check: "HOME_SW path", criterion: "6N137 opto -> C14/AIO246 (pin 44) -> Input X-BAR -> XINT3", note: "CPU interrupt only (no trip needed for homing)" },
                        { id: "5.2.4", check: "AIO digital input configuration", criterion: "GPHAMSEL register selects digital mode for all 5 AIO pins", note: "Input only — no output drive capability on AIO pins" }
                    ]
                },
                {
                    id: "sub5.3",
                    title: "5.3 Digital Output",
                    items: [
                        { id: "5.3.1", check: "DIO_OUT_B path", criterion: "GPIO9 (pin 90) -> 6N137 opto -> field side output", note: "GPIO9 is dedicated (discrete LEDs replaced by WS2812 on GPIO6)" },
                        { id: "5.3.2", check: "WS2812 LED chain", criterion: "8x XL-1615RGBC-2812B-S addressable RGB LEDs on GPIO6", note: "Replaces discrete LED_RED/LED_GREEN. 50ms pattern updates." }
                    ]
                }
            ],
            items: []
        },
        {
            id: "sec6",
            title: "Section 6: Error Budget Verification",
            sheet: "",
            subsections: null,
            items: [
                { id: "6.1", check: "ADC current resolution (raw 12-bit)", criterion: "3.3V/4096 / (5 mOhm x 10 V/V) = 16.1 mA/LSB (~32 nm raw)", note: "Effective ~5-8 nm after position loop filtering (DEC-001)" },
                { id: "6.2", check: "ADC current resolution (16x OS)", criterion: "16.1 mA / 4 = ~4 mA/LSB (~8 nm raw, ~2 nm effective)", note: "Verify oversampling dithering assumption" },
                { id: "6.3", check: "Encoder quantization", criterion: "20 nm / 2 = +/-10 nm half-count", note: "Structural, not filtered. Half the +/-20 nm budget." },
                { id: "6.4", check: "CSA thermal drift (30C)", criterion: "+/-15 uV/C x 30C = +/-450 uV -> +/-9 mA at 50 mV/A", note: "Dominant error. NOT filtered by position loop (low-freq). NTC target: +/-2-3 mA." },
                { id: "6.5", check: "PWM current ripple", criterion: "Vbus / (2 x L_motor x f_PWM)", note: "Motor inductance dependent. Verify ripple is acceptable." },
                { id: "6.6", check: "Power supply noise floor", criterion: "TPS7A2033: < 1 uVRMS -> < 0.02 mA equivalent", note: "Verify PSRR at switching frequencies" },
                { id: "6.7", check: "ADS7056 fallback resolution", criterion: "3.3V/16384 / (5 mOhm x 20 V/V) = ~2 mA/LSB (~4 nm raw, ~1 nm effective)", note: "DNP by default. Population criteria in DEC-001." },
                { id: "6.8", check: "VREFHI noise contribution", criterion: "Correlated VREFHI noise appears directly in ADC result, NOT filtered by position loop", note: "Verify R97=10R + decoupling is adequate" }
            ]
        },
        {
            id: "sec7",
            title: "Section 7: Control Architecture Review",
            sheet: "",
            subsections: null,
            items: [
                { id: "7.1", check: "Phase-synchronous sampling", criterion: "ADC triggered by ePWM at PWM midpoint", note: "Eliminates switching noise in current measurement" },
                { id: "7.2", check: "3-shunt topology", criterion: "All 3 phase currents measured independently", note: "Avoids reconstruction artifacts at low duty cycles" },
                { id: "7.3", check: "Current loop bandwidth", criterion: "Hardware supports 20-45 kHz update rate", note: "ADC speed, ISR budget adequate" },
                { id: "7.4", check: "HRPWM for position hold", criterion: "25.6 GHz effective PWM resolution", note: "Eliminates duty-cycle quantization at low current. Critical for +/-20 nm." },
                { id: "7.5", check: "Cascaded loop decimation", criterion: "Current (20-45 kHz) -> velocity (1 kHz) -> position (0.5-2 kHz)", note: "Verify MCU has CPU bandwidth for all loops" },
                { id: "7.6", check: "Boot offset calibration", criterion: "1024-sample CSA offset average at boot (motor not driven)", note: "Verify ADC input has stable bias when motor is off" },
                { id: "7.7", check: "Watchdog kick in control ISR", criterion: "GPIO12 toggle must occur every ISR period", note: "STWD100 timeout vs ISR period compatibility" },
                { id: "7.8", check: "Fault detection path", criterion: "DRV8353 nFAULT -> MCU GPIO (interrupt capable)", note: "Verify ISR can read fault within 1 PWM period" },
                { id: "7.9", check: "Pulse command CLB path", criterion: "STEP/DIR via CLB QepOnClb at SYSCLK (100 MHz)", note: "Verify CLB tile resources available and configured" },
                { id: "7.10", check: "Limit switch hardware trip", criterion: "AIO -> Input X-BAR -> ePWM Trip Zone for instant PWM shutdown", note: "< 1 PWM cycle latency, no firmware delay" }
            ]
        }
    ]
};
