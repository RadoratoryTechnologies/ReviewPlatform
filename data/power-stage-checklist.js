const POWER_STAGE_CHECKLIST = {
    title: "Power Stage Reviewer Checklist",
    project: "ServoTIv1",
    role: "Power Stage & Power Electronics Expert",
    dateIssued: "2026-04-17",
    instructions: "This checklist covers the power stage, protection, power supply, EMI/EMC, thermal, and chassis/PE ground aspects of the ServoTIv1 servo drive. Please mark each item as PASS / FAIL / N/A and add comments where needed.",
    specs: [
        "DC bus: 24-60V (nominal 48V)",
        "Continuous phase current: 5A",
        "Peak phase current: 15-20A (short duration)",
        "PWM frequency: 20-45 kHz (center-aligned, complementary)",
        "MOSFETs: 6x CSD19535KTT (100V, 5 mOhm Rds(on), NexFET)",
        "Gate driver: DRV8353SRTAT (100V, SPI configurable, Smart Gate)",
        "Brake resistor: 33 Ohm / 35W, 25% max duty cycle, fw limited 200ms ON + 2s cooldown",
        "Position error target: +/-20 nm"
    ],
    sheets: [
        { name: "EMI_Protection.kicad_sch", content: "DC input: XT60 connector, 20A fuse (conditional), SMDJ64A TVS, crowbar diode, pre-charge (G900P15M + MMBTA42), bulk caps (3x 1000uF/100V), CMC + differential inductor (DNP, bypassed by 0R)" },
        { name: "PowerTree.kicad_sch", content: "LM5164 (60V->12V buck, PGOOD monitored), TPS563200 (12V->5V), TLV1117LV33 (5V->3.3V_D), TPS7A2033 (ultra-low-noise 3.3V_A LDO), rail monitoring (VSENSE_5V, VSENSE_3V3), UVLO divider" },
        { name: "Inverter.kicad_sch", content: "3-phase half-bridge (6x CSD19535KTT), 3x 5 mOhm Kelvin shunts, bypass caps, snubber footprints (DNP), CM choke on motor output, motor phase fuses F2/F3/F4" },
        { name: "GateDriver.kicad_sch", content: "DRV8353SRTAT, bootstrap caps, gate resistors (10R in Inverter), SPI-A interface, CSA anti-alias RC filters" },
        { name: "BrakeOVP.kicad_sch", content: "LM393 comparator, SCR latch (MMBTA42), CSD19535KTT brake MOSFET, 33 Ohm/35W brake resistor, OVP_STATUS export, BRAKE_ACTIVE feedback, J18 external brake connector" },
        { name: "STO_Safety.kicad_sch", content: "Safe Torque Off: 3-path disable (ENABLE + INH gating + GL clamp via 2N7002), STWD100 watchdog, test pulse, monitoring" },
        { name: "ServoTIv1.kicad_sch (root)", content: "Sheet hierarchy, rail jumpers (CRIT-PWR-1), ground domain ties (R50/R218), GND_CHASSIS net, shield drain pads (TP1-TP4), H1-H5 mounting holes" }
    ],
    sections: [
        {
            id: "sec1",
            title: "Section 1: DC Input & EMI Protection",
            sheet: "EMI_Protection.kicad_sch",
            items: [
                { id: "1.1", check: "Input connector rated for max current", criterion: "XT60 (J1): >= 20A continuous at 60V", note: "" },
                { id: "1.2", check: "Fuse rating and breaking capacity", criterion: "F1 (0456020.ER): 20A fast-acting, NANO2. CONDITIONAL: acceptable if PSCC < 400A and Icont < 15A", note: "Production: verify PSCC from actual supply. Consider 25A 0456025.ER for heavy loads." },
                { id: "1.3", check: "TVS D1 standoff vs max operating voltage", criterion: "SMDJ64A: Vrwm=64V > 60V bus", note: "4V margin for regen transients. D184 (SMDJ58A) provides local backup." },
                { id: "1.4", check: "TVS D1 clamping voltage vs component abs-max", criterion: "SMDJ64A: Vc=103V @ Ipp; CSD19535KTT abs-max = 100V", note: "3V margin at surge. D184 clamps at 93.6V locally — protects inverter." },
                { id: "1.5", check: "TVS D184 local inverter protection", criterion: "SMDJ58A: 58V standoff, 93.6V clamp < 100V abs-max", note: "Verify placement in Inverter sheet near MOSFET bus" },
                { id: "1.6", check: "Reverse polarity protection", criterion: "Crowbar diode D9 (MBR30100CT) after fuse", note: "Verify diode triggers before sensitive components are damaged" },
                { id: "1.7", check: "Pre-charge / inrush limiting", criterion: "Q1 (G900P15M, 150V PMOS) + Q9 (MMBTA42, 300V NPN) + R2 (47R/10W TO-220)", note: "Peak 76.6W during ~141ms charge time. D4 = 12V Zener clamps Vgs. Verify inrush < fuse I2t rating." },
                { id: "1.8", check: "Bulk capacitor voltage rating", criterion: "3x 1000uF/100V electrolytic (C1/C2/C73)", note: "100V >> 60V bus. Verify 105C temperature rating before ordering." },
                { id: "1.9", check: "Bulk capacitor ripple current rating", criterion: "RMS ripple at 45 kHz PWM x 5A continuous", note: "Calculate worst-case ripple vs cap spec" },
                { id: "1.10", check: "Ceramic cap for HF ripple", criterion: "C3: 4.7uF/100V 1206 ceramic", note: "DC bias derating at 60V: actual ~1.5-2.3uF. Verify ESR/ESL adequate for HF decoupling." },
                { id: "1.11", check: "Common-mode choke on DC input", criterion: "CMC in input path", note: "Verify impedance at target frequencies" },
                { id: "1.12", check: "Differential-mode inductor", criterion: "L170/L171 (10uH) are DNP; R125/R126 (0R, 1225, 2W Vishay) bypass them", note: "If EMI inductors ever needed, select parts rated 25A+ (Coilcraft XAL1010)" }
            ]
        },
        {
            id: "sec2",
            title: "Section 2: Power Supply Tree",
            sheet: "PowerTree.kicad_sch",
            items: [
                { id: "2.1", check: "HV buck input voltage range", criterion: "LM5164 (U1): rated to 100V, operating at 24-60V", note: "" },
                { id: "2.2", check: "HV buck output regulation", criterion: "12.2V (R4=448K / R5=49.9K)", note: "Check feedback divider values" },
                { id: "2.3", check: "HV buck switching frequency", criterion: "LM5164: ~400 kHz (RON=100K, R33)", note: "Verify no overlap with PWM harmonics" },
                { id: "2.4", check: "HV buck PGOOD monitoring", criterion: "LM5164 PGOOD (pin 6) -> R213 10K pull-up -> PGOOD_12V -> MCU ADCINA4 (pin 36)", note: "NEW (ECO-027-B): 3.3V = good, 0V = fault" },
                { id: "2.5", check: "HV buck EN/UVLO threshold", criterion: "~17.4V rising / ~16.7V falling (R170=133K / R171=10K)", note: "Verify trip point is above DRV8353 UVLO requirement" },
                { id: "2.6", check: "L5 load budget (CRITICAL)", criterion: "Bourns SRN6045TA-680M (68uH), Irms=1.1A, Isat=1.6A. Typical: 0.28A. Max: 1.6A", note: "Total +12V current must stay below 1A for thermal margin. Upgrade: SRN8040-680M (Irms=2.3A)." },
                { id: "2.7", check: "5V buck regulation", criterion: "TPS563200 (U8): 4.97V (R28=54.9K / R27=10K), 3A max", note: "L2 = 4.7uH Bourns SRP7028A-4R7M, Isat ~7A" },
                { id: "2.8", check: "3.3V digital LDO", criterion: "TLV1117LV33 (U34): ceramic-cap stable, dropout 1.1V", note: "Headroom = 1.7V from 5V. Output caps: C10=22uF (2220) + C68=100nF." },
                { id: "2.9", check: "Analog LDO noise", criterion: "TPS7A2033 (U2): < 1 uVRMS (10 Hz - 100 kHz)", note: "Critical for ADC current sensing quality. NR pin: C217=10nF." },
                { id: "2.10", check: "Analog LDO PSRR", criterion: "TPS7A2033: > 70 dB at 1 MHz", note: "Must reject LM5164 switching ripple" },
                { id: "2.11", check: "Rail isolation (analog vs digital)", criterion: "Separate LDOs: TLV1117LV33 (+3V3_D) and TPS7A2033 (+3V3_A) both from +5V", note: "" },
                { id: "2.12", check: "ADC reference filtering", criterion: "R97=10R + decoupling on VREFHI", note: "Verify RC corner doesn't limit ADC sample settling. VREFHI bypass quality critical for low-freq noise." },
                { id: "2.13", check: "5V rail voltage monitoring", criterion: "VSENSE_5V: R214/R215 10K/10K divider -> MCU ADCINA8 (pin 37), ~2.5V nominal", note: "NEW (ECO-027-B)" },
                { id: "2.14", check: "3.3V rail voltage monitoring", criterion: "VSENSE_3V3: R216/R217 10K/10K divider -> MCU ADCINB4 (pin 39), ~1.65V nominal", note: "NEW (ECO-027-B)" },
                { id: "2.15", check: "Rail jumpers (CRIT-PWR-1)", criterion: "J12V1, J5V1, J3V3_D1, J3V3_A1: Jumper_2_Open symbols. 4x shunt caps mandatory.", note: "Board ships DISCONNECTED. Must install 0.1\" shunt jumper caps before power-up." },
                { id: "2.16", check: "Power indication LEDs", criterion: "4x NCD0603R1 red LEDs: +12V (D16/R109 4.7K), +5V (D19/R112 2.2K), +3V3_D (D18/R111 1K), +3V3_A (D17/R110 1K)", note: "Pure hardware, no firmware needed" }
            ]
        },
        {
            id: "sec3",
            title: "Section 3: 3-Phase Inverter",
            sheet: "Inverter.kicad_sch",
            items: [
                { id: "3.1", check: "MOSFET Vds rating vs bus + regen", criterion: "CSD19535KTT: 100V >> 60V + regen headroom", note: "" },
                { id: "3.2", check: "MOSFET Rds(on) and conduction loss", criterion: "5 mOhm; P = 6 x 25 x 0.005 = 0.75W @ 5A", note: "Check Rds(on) at max Tj" },
                { id: "3.3", check: "MOSFET peak current capability", criterion: "CSD19535KTT: 84A continuous rating. Verify SOA at 15-20A peak", note: "" },
                { id: "3.4", check: "MOSFET gate charge vs driver capability", criterion: "Qg vs DRV8353 source/sink current at target switching speed", note: "DRV8353 Smart Gate controls slew rate" },
                { id: "3.5", check: "MOSFET thermal pad and heatsinking", criterion: "Copper pour; verify thermal resistance to ambient", note: "Calculate Tj at 15A peak for worst-case move" },
                { id: "3.6", check: "Gate resistors", criterion: "R6/R7/R9/R10/R12/R13 = 10R series in Inverter sheet. ONLY gate resistance in path.", note: "22R in GateDriver (R30/R34/R35/R36) are SPI bus damping, NOT gate drive." },
                { id: "3.7", check: "Gate-source pull-downs", criterion: "R70-R75 = 100K (0603), one per MOSFET", note: "Ensures MOSFETs stay OFF during power-up and controller reset" },
                { id: "3.8", check: "Bypass capacitor per half-bridge", criterion: "C13/C14/C15 = 100nF/100V 1206 (one per phase, within 5mm of drain-source)", note: "Plus C59/C60/C61 = 100uF/100V electrolytic per phase. Verify 105C rating." },
                { id: "3.9", check: "Snubber network footprints", criterion: "C74/C77-C81 (2.2nF/100V/C0G) + R43/R52-R56 (4.7R), all DNP", note: "Pads exist as rework option. DRV8353 gate drive is sufficient." },
                { id: "3.10", check: "Motor output CM choke", criterion: "L_CM1 (PDMFAT22148D-202MLB-6P, C3011552)", note: "Verify current rating >= 5A continuous. Use single 3-phase unit, do NOT split per phase." },
                { id: "3.11", check: "Motor phase fuses", criterion: "F2/F3/F4: 12A slow-blow (0452012.MRL, NANO2, 72VAC/60VDC)", note: "At 60V bus = zero VDC margin. Verify interrupt capacity." },
                { id: "3.12", check: "Motor connector rating", criterion: "J2: Phoenix Contact MSTBA 3-pin 5.08mm screw terminal", note: "" },
                { id: "3.13", check: "Shunt resistor value and power", criterion: "R8/R11/R14: 3x 5 mOhm, 3W, 2512 (RALEC LR2512-23R005F4). At 20A: 2.0W (67%)", note: "" },
                { id: "3.14", check: "Shunt Kelvin sense routing", criterion: "4-wire: SH_A+/-, SH_B+/-, SH_C+/- to DRV8353 SPx/SNx", note: "CRITICAL: All 6 sense lines assigned to Analog net class for matched PCB routing." },
                { id: "3.15", check: "Shunt temperature coefficient", criterion: "< 50 ppm/C metal strip element", note: "Contributes to thermal drift budget" },
                { id: "3.16", check: "Shunt inductance", criterion: "< 1 nH for switching-edge rejection", note: "4-terminal Kelvin design" }
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
                { id: "4.4", check: "Dead-time configuration", criterion: "SPI configurable; verify minimum > body diode Trr", note: "" },
                { id: "4.5", check: "OCP (VDS monitoring) threshold", criterion: "SPI configurable; set above peak operating current", note: "Verify trip level protects MOSFETs" },
                { id: "4.6", check: "UVLO on VCC and bootstrap", criterion: "DRV8353 integrated; verify thresholds adequate", note: "" },
                { id: "4.7", check: "nFAULT output to MCU", criterion: "Connected to MCU GPIO, interrupt-capable", note: "" },
                { id: "4.8", check: "SPI-A interface to MCU", criterion: "GPIO58 (CLK), GPIO56 (MOSI), GPIO57 (MISO), GPIO59 (CS)", note: "SPI mode 1, 1 MHz" },
                { id: "4.9", check: "CSA input resistors", criterion: "R37/R38 = 22R per phase; per TI reference", note: "Verify compatibility with Kelvin shunt routing" },
                { id: "4.10", check: "CSA anti-alias RC filter", criterion: "100R + 2.2nF C0G (fc = 723 kHz) per phase", note: "Verify fc > 2x current loop BW but < Nyquist/2" },
                { id: "4.11", check: "VCC decoupling", criterion: "Bypass caps per DRV8353 datasheet", note: "" },
                { id: "4.12", check: "DVDD decoupling", criterion: "Bypass caps per DRV8353 datasheet", note: "" },
                { id: "4.13", check: "VREF decoupling", criterion: "C19 = 1uF to AGND return", note: "TI datasheet requirement" },
                { id: "4.14", check: "ADS7056 fallback ADCs (DNP)", criterion: "U17/U18/U19 placed, SPI-B routed, DNP by default", note: "Verify SPI bus doesn't conflict when DNP" }
            ]
        },
        {
            id: "sec5",
            title: "Section 5: Brake Chopper & Overvoltage Protection",
            sheet: "BrakeOVP.kicad_sch",
            items: [
                { id: "5.1", check: "Threshold ordering", criterion: "Bus (60V) < TVS standoff (64V) < Brake ON (65.5V) < OVP (67.8V) < TVS breakdown (~71V) < D184 clamp (93.6V) < D1 clamp (~103V)", note: "CRITICAL: verify all threshold values from divider calculations" },
                { id: "5.2", check: "LM393 comparator accuracy", criterion: "Verify offset and hysteresis vs threshold spacing", note: "3V hysteresis on brake (65.5V ON / 62.5V OFF)" },
                { id: "5.3", check: "Brake threshold divider values", criterion: "Calculate actual trip point from resistor values", note: "" },
                { id: "5.4", check: "OVP threshold divider values", criterion: "R64=442K; calculate actual trip point", note: "Target: 67.8V" },
                { id: "5.5", check: "SCR latch reliability", criterion: "Q8/Q10 (MMBTA42, 300V NPN). Verify holding current, reset mechanism", note: "Reset via MCU GPIO through Q10. Replaced MMBT3904 for voltage margin." },
                { id: "5.6", check: "Brake MOSFET rating", criterion: "CSD19535KTT: 100V, adequate for 60V bus", note: "Same part as inverter MOSFETs" },
                { id: "5.7", check: "Brake resistor power budget", criterion: "R95: 35W @ 25% duty max; peak instantaneous = 67.8^2/33 = 139W", note: "Firmware limited: 200ms ON + 2s cooldown. Prototype only." },
                { id: "5.8", check: "J18 external brake resistor connector", criterion: "J_BRAKE (Conn_01x02) in parallel with R95 via BRAKE_SW/VBUS labels", note: "Production external resistor option" },
                { id: "5.9", check: "BRAKE_ACTIVE feedback to MCU", criterion: "BRAKE_OUT -> R301(10K)/R300(3.3K)/C221(100pF) -> MCU ADCINA2 (pin 9), ~2.98V when active", note: "NEW (ECO C4/H3)" },
                { id: "5.10", check: "OVP_STATUS feedback to MCU", criterion: "OVP_STATUS -> R296 (1K series) -> MCU ADCINA9 (pin 38)", note: "NEW (ECO-027-A): Unambiguous OVP latch detection" },
                { id: "5.11", check: "Input filter capacitor", criterion: "10nF on comparator inputs to reject noise", note: "" },
                { id: "5.12", check: "Firmware-independence", criterion: "Brake/OVP must function without MCU intervention", note: "Verify all paths are hardware-only. OVP_STATUS/BRAKE_ACTIVE are read-only monitors." }
            ]
        },
        {
            id: "sec6",
            title: "Section 6: Safe Torque Off (STO)",
            sheet: "STO_Safety.kicad_sch",
            items: [
                { id: "6.1", check: "Triple-path redundancy", criterion: "3 independent disable paths (ENABLE, INH, GL clamp)", note: "IEC 61800-5-2 requires redundant paths. Path 3 independent of DRV8353." },
                { id: "6.2", check: "Path 1: ENABLE gating", criterion: "GPIO13 (DRV_EN_MCU) AND-gated (U21, SN74LVC1G08) with STWD100 WD_OK", note: "DO NOT REPURPOSE GPIO13" },
                { id: "6.3", check: "Path 2: INH gating", criterion: "SN74LVC1G08 AND gates gate INH signals to DRV8353", note: "Verify logic levels and propagation delay" },
                { id: "6.4", check: "Path 3: GL clamp", criterion: "Q14/Q15/Q16 (2N7002) via U20 (SN74LVC1G04) inverter clamp GLA/GLB/GLC to PGND", note: "Verify 2N7002 Vgs threshold. 0.35W pkg, 2-6W transient. Consider BSS138 for margin." },
                { id: "6.5", check: "Monitoring feedback", criterion: "GPIO39/GPIO40 read back STO state", note: "Verify MCU can detect discrepancy between channels" },
                { id: "6.6", check: "Test pulse capability", criterion: "GPIO30/GPIO31 can inject test pulses", note: "Verify test pulse does not cause motor torque" },
                { id: "6.7", check: "Response time", criterion: "Hardware gating < 1 ms", note: "Measure propagation through each path" },
                { id: "6.8", check: "Power supply independence", criterion: "STO must function if MCU is not running", note: "R15=100K pull-down ensures safe default = OFF" },
                { id: "6.9", check: "External watchdog integration", criterion: "STWD100 (U22) + AND gate (U21) gates DRV_ENABLE", note: "WD timeout if MCU locks up. GPIO12 toggle must occur every ISR period." },
                { id: "6.10", check: "Safe state definition", criterion: "All paths disable = motor coasts (no active braking)", note: "Verify this is acceptable for your application" }
            ]
        },
        {
            id: "sec7",
            title: "Section 7: Chassis/PE Ground (ECO-029)",
            sheet: "ServoTIv1.kicad_sch (root)",
            items: [
                { id: "7.1", check: "GND_CHASSIS net exists", criterion: "H1-H4 (M3 pads) + H5 (M4 PE stud) connected to GND_CHASSIS", note: "" },
                { id: "7.2", check: "PGND-to-GND_CHASSIS coupling", criterion: "R218 (0R, 0603) single-point tie between PGND and GND_CHASSIS", note: "PCB grounding strategy tie only, NOT safety fault-current conductor" },
                { id: "7.3", check: "PE terminal", criterion: "H5 (MountingHole_4.3mm_M4_Pad) for ring-terminal bonding", note: "Bond resistance < 0.1 Ohm target (verify after PCB fab per IEC 61800-5-1)" },
                { id: "7.4", check: "Shield drain pads", criterion: "TP1 (encoder J4), TP2 (Hall J8), TP3 (CAN J6), TP4 (motor J2) on GND_CHASSIS", note: "Verify placement within 5mm of cable-entry areas" },
                { id: "7.5", check: "Mounting hole pad exposure", criterion: "No solder mask on H1-H5 annular rings; star washers for chassis bonding", note: "Layout phase item" },
                { id: "7.6", check: "Product class declaration", criterion: "PE path conditional on Class I metal enclosure. Class II: not required.", note: "Design has not yet declared a class" }
            ]
        },
        {
            id: "sec8",
            title: "Section 8: Thermal Design",
            sheet: "",
            items: [
                { id: "8.1", check: "MOSFET worst-case Tj", criterion: "Calculate at 15A peak, 45 kHz, max ambient", note: "" },
                { id: "8.2", check: "Shunt resistor worst-case temperature", criterion: "1.125W in 2512; verify temperature rise", note: "Affects current sensing accuracy via TCR" },
                { id: "8.3", check: "NTC placement near shunts", criterion: "TH1 (10K NTC B3435) mandatory, populated", note: "Critical for CSA thermal drift compensation" },
                { id: "8.4", check: "DRV8353 thermal management", criterion: "Verify exposed pad connected to ground pour", note: "" },
                { id: "8.5", check: "LM5164 thermal pad", criterion: "Verify thermal via array and copper pour", note: "PCB layout item" },
                { id: "8.6", check: "Brake resistor thermal isolation", criterion: "R95 (33R/35W) away from sensitive components", note: "PCB layout item" },
                { id: "8.7", check: "Pre-charge resistor thermal", criterion: "R2 (47R/10W TO-220): Peak 76.6W during 141ms", note: "Verify SOA and mounting" },
                { id: "8.8", check: "Worst-case ambient temperature", criterion: "Verify all components rated for max operating temp", note: "Check industrial temp range (-40 to +85C) requirement" }
            ]
        },
        {
            id: "sec9",
            title: "Section 9: PCB Layout Concerns",
            sheet: "",
            items: [
                { id: "9.1", check: "High-current loop area minimization", criterion: "Bulk cap -> FETs -> shunt -> return must be tight", note: "" },
                { id: "9.2", check: "Gate trace length", criterion: "< 20mm from DRV8353 to each MOSFET gate", note: "" },
                { id: "9.3", check: "Kelvin sense trace routing", criterion: "Differential pair from shunt pads to DRV8353, no shared current path", note: "Assigned to Analog net class" },
                { id: "9.4", check: "PGND copper pour", criterion: "Continuous under inverter, MOSFETs, shunts, bulk caps", note: "" },
                { id: "9.5", check: "Thermal via arrays", criterion: "Under MOSFET pads, DRV8353 exposed pad, LM5164 pad", note: "" },
                { id: "9.6", check: "Motor connector proximity", criterion: "J2 close to CM choke output; short high-current traces", note: "" },
                { id: "9.7", check: "Brake resistor placement", criterion: "R95 thermally isolated from precision components", note: "" },
                { id: "9.8", check: "Star ground tie point", criterion: "R190 (0R) connects AGND/DGND near shunts/ADC reference", note: "" },
                { id: "9.9", check: "JTAG trace length", criterion: "J3 <= 6 inches (15.24 cm) from MCU JTAG pins", note: "Per F280049C datasheet Fig 6-26. If exceeded, add buffers." },
                { id: "9.10", check: "Isolation creepage/clearance", criterion: "DigitalIO field isolation, CAN isolation: verify PCB gap", note: "B0503S-1WR3 (1500VDC), ISO1044BD (1000VDC)" }
            ]
        }
    ]
};
