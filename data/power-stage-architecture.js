const POWER_STAGE_ARCHITECTURE = [
    {
        id: "system-context",
        title: "1. System Context",
        html: `
            <h4>What This Drive Does</h4>
            <p>ServoTIv1 is a 3-phase FOC servo controller for driving ironless linear motors. The design targets high-precision current control with low noise and low drift, with a position error target of &plusmn;20 nm.</p>
            <h4>Design Requirements</h4>
            <ul>
                <li><strong>STO (Safe Torque Off)</strong> per IEC 61800-5-2</li>
                <li><strong>CE EMC compliance</strong> per EN 61800-3</li>
                <li><strong>Full FOC source code access</strong> on the MCU</li>
                <li><strong>Opto-isolated digital I/O</strong> for limit switches and pulse command</li>
                <li><strong>Multi-protocol communication</strong>: USB-UART, CAN (isolated), RS-232, Modbus RTU</li>
            </ul>
            <h4>Electrical Operating Point</h4>
            <table>
                <tr><th>Parameter</th><th>Value</th></tr>
                <tr><td>DC bus voltage</td><td>24-60V (nominal 48V)</td></tr>
                <tr><td>Continuous phase current</td><td>5A</td></tr>
                <tr><td>Peak phase current</td><td>15-20A (short duration)</td></tr>
                <tr><td>PWM frequency</td><td>20-45 kHz (center-aligned, complementary)</td></tr>
                <tr><td>Motor type</td><td>3-phase ironless linear (low inductance)</td></tr>
                <tr><td>Current sensing</td><td>3&times; low-side shunt + DRV8353 CSA</td></tr>
                <tr><td>Position error target</td><td>&plusmn;20 nm</td></tr>
            </table>
            <h4>Schematic Structure (10 Sheets)</h4>
            <p>Root (ServoTIv1) &rarr; EMI_Protection, PowerTree, Inverter, GateDriver, BrakeOVP, STO_Safety, MCU, Communications, EncoderInterface, DigitalIO</p>
        `
    },
    {
        id: "mosfets",
        title: "2. Why These MOSFETs (CSD19535KTT)",
        html: `
            <p>We chose the <strong>CSD19535KTT</strong> (100V, 5 m&Omega; Rds(on), NexFET) for the 3-phase half-bridge:</p>
            <ul>
                <li><strong>Voltage margin:</strong> 100V rating on a 60V bus gives 40V margin for inductive spikes during rapid current reversal.</li>
                <li><strong>Conduction losses are trivial:</strong> At 5A continuous, total loss across all 6 MOSFETs is P = 6 &times; 25 &times; 0.005 = 0.75W. At 15A peak, 6.75W.</li>
                <li><strong>TI ecosystem:</strong> Used in TI's motor control reference designs &mdash; proven compatibility with the DRV8353.</li>
                <li><strong>Same FET for brake chopper:</strong> CSD19535KTT also used as the brake MOSFET, reducing BOM variety.</li>
                <li><strong>Why not GaN/SiC:</strong> At 60V/5A/45 kHz, silicon MOSFETs are the correct technology. GaN adds complexity with marginal switching-loss benefit at these operating conditions.</li>
            </ul>
        `
    },
    {
        id: "gate-driver",
        title: "3. Why DRV8353SRTAT (Gate Driver + Integrated CSA)",
        html: `
            <p>The DRV8353 provides <strong>three functions in one IC</strong>:</p>
            <ol>
                <li><strong>Gate driver</strong> (100V, configurable drive strength, dead-time insertion, Smart Gate slew control)</li>
                <li><strong>3&times; current-sense amplifiers</strong> (5/10/20/40 V/V gain, SPI configurable)</li>
                <li><strong>Protection</strong> (OCP via VDS monitoring, UVLO, overtemperature, fault reporting via nFAULT)</li>
            </ol>
            <h4>The Tradeoff We Accepted</h4>
            <p>The DRV8353 CSA has &plusmn;15 &micro;V/&deg;C offset drift. Over a 30&deg;C excursion, this produces &plusmn;450 &micro;V drift (&plusmn;9 mA phantom current at 50 mV/A sensitivity). We mitigate with:</p>
            <ul>
                <li><strong>Mandatory NTC</strong> (TH1, 10K B3435) near shunt resistors, read by MCU ADC</li>
                <li><strong>External motor NTC</strong> via J13 connector &rarr; ADC A5 (motor_temp) with R207 10K pull-up, C208 100nF filter, D179 BAT54WS clamp</li>
                <li><strong>Firmware temperature compensation</strong> using NTC readings</li>
                <li><strong>ADS7056 fallback ADCs</strong> (14-bit, DNP) if needed</li>
            </ul>
            <h4>Enable Chain (Triple-Gated)</h4>
            <pre>DRV_EN_MCU (GPIO13) --[U21 AND]--> DRV_ENABLE --[U14 AND]--> DRV8353 ENABLE
WD_OK (STWD100) --------^              STO_OK --------^
                                        R15=100K pull-down (safe default = OFF)</pre>
            <p><strong>GPIO13 = DRV_EN_MCU: DO NOT REPURPOSE.</strong></p>
        `
    },
    {
        id: "shunt-topology",
        title: "4. Why 3-Shunt Topology",
        html: `
            <p>We use <strong>3 independent low-side shunt resistors</strong> (5 m&Omega; each, RALEC LR2512-23R005F4, 3W) with Kelvin sense connections.</p>
            <h4>Why Not 2-Shunt</h4>
            <p>2-shunt sensing has measurement dead zones at low duty cycles, creating current reconstruction artifacts that appear as torque ripple. For precision current control, any reconstruction artifact directly becomes a force disturbance.</p>
            <h4>Shunt Value: 5 m&Omega;</h4>
            <ul>
                <li>At 5A: signal = 25 mV &rarr; CSA output: 250 mV swing from bias</li>
                <li>At 15A peak: 1.125W dissipation (within 2512/3W rating)</li>
                <li>At 20A peak: 2.0W (67% of rating)</li>
                <li>If more resolution needed: increase CSA gain to 20 V/V via SPI &mdash; no hardware change</li>
            </ul>
            <h4>Gate Resistors</h4>
            <p>R6/R7/R9/R10/R12/R13 = 10&Omega; series in Inverter sheet. This is the <strong>ONLY</strong> gate resistance in the path. The 22&Omega; resistors in GateDriver (R30/R34/R35/R36) are SPI bus damping, NOT gate drive. DRV8353 Smart Gate controls slew rate internally.</p>
        `
    },
    {
        id: "input-protection",
        title: "5. Input Protection Architecture",
        html: `
            <p>Layered defense strategy:</p>
            <pre>DC Input --> F1 Fuse --> D9 Crowbar --> CMC --> Diff inductor --> Bulk caps --> Inverter
                                                                         |
                                                                  D1 TVS (SMDJ64A)
                                                                  D184 TVS (SMDJ58A, local)</pre>
            <h4>Each Layer's Purpose</h4>
            <ul>
                <li><strong>20A Fuse (F1, 0456020.ER):</strong> Ultimate overcurrent protection. CONDITIONAL &mdash; acceptable if PSCC &lt; 400A and continuous current &lt; 15A. Production: verify PSCC from actual supply.</li>
                <li><strong>Crowbar Diode (D9, MBR30100CT):</strong> Reverse polarity &mdash; short-circuits and blows fuse instead of destroying electronics.</li>
                <li><strong>TVS D1 (SMDJ64A):</strong> Bus-level surge protection. 64V standoff, ~103V clamp at Ipp &mdash; exceeds 100V MOSFET abs-max.</li>
                <li><strong>TVS D184 (SMDJ58A):</strong> Local inverter protection. 58V standoff, ~93.6V clamp &mdash; protects MOSFETs/DRV8353 from D1 overshoot.</li>
                <li><strong>CMC + Diff Inductor:</strong> Conducted EMC compliance (EN 61800-3). L170/L171 (10&micro;H) are DNP; R125/R126 (0&Omega;, 1225, 2W) bypass them.</li>
                <li><strong>Bulk Caps:</strong> 3&times; 1000&micro;F/100V electrolytic (C1/C2/C73) + 4.7&micro;F/100V 1206 ceramic (C3, ~1.5-2.3&micro;F after DC bias derating at 60V)</li>
                <li><strong>Pre-charge:</strong> Q1 (G900P15M, 150V PMOS) + Q9 (MMBTA42, 300V NPN gate driver) + R2 (47&Omega;/10W TO-220). Peak 76.6W during ~141ms charge time (&tau; = 47&Omega; &times; 3mF). D4 = 12V Zener clamps Vgs on Q1.</li>
            </ul>
            <h4>Voltage Ordering (Critical)</h4>
            <table>
                <tr><th>Voltage</th><th>Event</th></tr>
                <tr><td>60V</td><td>Normal bus operation</td></tr>
                <tr><td>64V</td><td>D1 (SMDJ64A) standoff</td></tr>
                <tr><td>65.5V</td><td>Brake chopper ON</td></tr>
                <tr><td>67.8V</td><td>OVP latch triggers</td></tr>
                <tr><td>71.1V</td><td>D1 breakdown</td></tr>
                <tr><td>93.6V</td><td>D184 (SMDJ58A) clamp &mdash; local MOSFET protection</td></tr>
                <tr><td>~103V</td><td>D1 clamping voltage at Ipp</td></tr>
            </table>
            <p><strong>Risk:</strong> D1 clamp (103V) exceeds CSD19535KTT/DRV8353 abs-max (100V). D184 provides local protection below 100V. Prototype surge validation required per DEC-006.</p>
        `
    },
    {
        id: "brake-chopper",
        title: "6. Brake Chopper & OVP Design",
        html: `
            <p>During deceleration, the linear motor regenerates energy back into the DC bus. The hardware-autonomous brake chopper dissipates this energy.</p>
            <h4>Threshold Ordering (Critical)</h4>
            <table>
                <tr><th>Voltage</th><th>Event</th></tr>
                <tr><td>60V</td><td>Normal bus operation</td></tr>
                <tr><td>65.5V</td><td>Brake chopper ON (hardware, dissipates energy)</td></tr>
                <tr><td>62.5V</td><td>Brake chopper OFF (3V hysteresis)</td></tr>
                <tr><td>67.8V</td><td>OVP latch (hardware, disables gate drive)</td></tr>
            </table>
            <p><strong>Why hardware, not firmware:</strong> Must work even if MCU has crashed. LM393 comparator + SCR latch (Q8/Q10, MMBTA42 300V NPN) + CSD19535KTT MOSFET + 33&Omega;/35W resistor.</p>
            <p><strong>Limitation:</strong> 35W resistor at 139W peak = 25% duty max. Firmware limited to 200ms ON + 2s cooldown. Single moves are fine; continuous rapid cycling needs characterization.</p>
            <h4>BRAKE_ACTIVE Feedback (ECO C4/H3)</h4>
            <p>MCU can read brake state: BRAKE_OUT (LM393 open-collector, R92 10K pull-up to +12V) &rarr; R301(10K)/R300(3.3K)/C221(100pF) divider &rarr; MCU pin 9 / ADCINA2 (~2.98V when brake active).</p>
            <h4>J18 External Brake Resistor</h4>
            <p>J_BRAKE (J18, Conn_01x02) in parallel with R95 via BRAKE_SW/VBUS labels. Allows production external brake resistor. R95 value = 33&Omega; prototype-only.</p>
            <h4>OVP Observability (ECO-027-A)</h4>
            <p>OVP_STATUS global label from BrakeOVP via R296 (1K series) to MCU ADCINA9 (pin 38). Firmware reads ADC with threshold detection for unambiguous OVP fault identification.</p>
        `
    },
    {
        id: "sto",
        title: "7. Safe Torque Off (3-Path STO)",
        html: `
            <p>IEC 61800-5-2 compliance requires redundant disable paths. We implemented 3 independent paths:</p>
            <ol>
                <li><strong>Path 1 &mdash; ENABLE Gating:</strong> DRV_EN_MCU (GPIO13) AND-gated (U21, SN74LVC1G08) with watchdog output (STWD100 WD_OK). MCU lockup &rarr; gate disable.</li>
                <li><strong>Path 2 &mdash; INH Gating:</strong> SN74LVC1G08 AND gates gate the INH signals to DRV8353. STO de-assert &rarr; INH forced low.</li>
                <li><strong>Path 3 &mdash; GL Clamp:</strong> Q14/Q15/Q16 (2N7002) via U20 (SN74LVC1G04) inverter independently clamp gate-low signals to PGND. Fully independent of DRV8353.</li>
            </ol>
            <p><strong>Why 3 paths, not 2:</strong> Paths 1 and 2 both involve the DRV8353 &mdash; a common-cause failure could defeat both. Path 3 is completely independent of the DRV8353 IC.</p>
            <p><strong>Monitoring:</strong> GPIO39/GPIO40 read back STO state. GPIO30/GPIO31 provide test pulse capability.</p>
            <p><strong>Note:</strong> 2N7002 (SOT-23, 0.35W) may see 2-6W peak during transient contention. Verify pulsed SOA; consider BSS138 for margin.</p>
        `
    },
    {
        id: "emc-output",
        title: "8. Motor Output EMC Filter",
        html: `
            <p><strong>Problem:</strong> Motor cables radiate PWM switching harmonics. CSD19535KTT switches at 5-20 V/ns, creating common-mode currents through parasitic capacitances.</p>
            <p><strong>Solution:</strong></p>
            <ul>
                <li><strong>3-phase CM choke (L_CM1):</strong> PDMFAT22148D-202MLB-6P (C3011552), 9A rated, effective at 100 kHz-10 MHz. Use single 3-phase unit, do NOT split per phase.</li>
                <li><strong>RC snubber footprints (DNP):</strong> 6&times; pairs (4.7&Omega; + 2.2nF C0G), tuned during EMC pre-compliance testing</li>
                <li><strong>Motor phase fuses:</strong> F2/F3/F4 = 7A slow-blow (0452007.MRL, NANO2, 72VAC/60VDC) &mdash; allows motor inrush; at 60V bus = zero VDC margin</li>
            </ul>
            <p><strong>Motor connector:</strong> J2, Phoenix Contact MSTBA 3-pin 5.08mm screw terminal.</p>
        `
    },
    {
        id: "power-supply",
        title: "9. Power Supply Architecture",
        html: `
            <p>Four domains with decreasing noise:</p>
            <pre>VBUS (24-60V) --> LM5164 (~400 kHz buck, U1) --> 12V
    12V --> TPS563200 (U8) --> 5V (encoder, DigitalIO)
    5V --> TLV1117LV33 (U34) --> +3V3_D (digital MCU, comms)
    5V --> TPS7A2033 (U2, < 1 uVRMS LDO) --> +3V3_A (analog, ADC, CSA)</pre>
            <h4>LM5164 Details</h4>
            <p>Input range 24-60V (100V abs max). Output 12.2V (R4=448K / R5=49.9K). EN/UVLO threshold ~17.4V rising / ~16.7V falling. PGOOD (pin 6) now monitored by MCU via PGOOD_12V signal.</p>
            <h4>L5 Load Budget (CRITICAL)</h4>
            <p>Bourns SRN6045TA-680M (68&micro;H), Irms=1.1A, Isat=1.6A. Typical total +12V load: ~0.28A. <strong>Rule:</strong> total +12V current must stay below 1A for thermal margin.</p>
            <h4>Why Ultra-Low-Noise LDO</h4>
            <p>The TPS7A2033 achieves &lt; 1 &micro;VRMS output noise. At 50 mV/A current sensitivity, a 1 mV supply noise spike creates a 20 mA phantom current measurement.</p>
            <h4>Rail Jumpers (CRIT-PWR-1)</h4>
            <p>J12V1, J5V1, J3V3_D1, J3V3_A1 use Jumper_2_Open symbols. Board ships with all four rails <strong>DISCONNECTED</strong>. You MUST install 0.1" shunt jumper caps (XFCN F254D-02-0135-PT-B) on all four headers before power-up.</p>
            <h4>Rail Health Monitoring (ECO-027-B)</h4>
            <table>
                <tr><th>Signal</th><th>MCU Pin</th><th>Source</th><th>Nominal ADC</th></tr>
                <tr><td>PGOOD_12V</td><td>Pin 36 / ADCINA4</td><td>LM5164 PGOOD (pin 6) + R213 10K pull-up</td><td>3.3V (good) / 0V (fault)</td></tr>
                <tr><td>VSENSE_5V</td><td>Pin 37 / ADCINA8</td><td>R214/R215 10K/10K divider from +5V</td><td>~2.5V</td></tr>
                <tr><td>VSENSE_3V3</td><td>Pin 39 / ADCINB4</td><td>R216/R217 10K/10K divider from +3V3_D</td><td>~1.65V</td></tr>
            </table>
            <h4>Ground Domains</h4>
            <pre>AGND ---R190 (0R, MCU sheet)---> DGND ---R50 (0R, root)---> PGND
                                                                   |
R51 (AGND->PGND) = DNP (debug only)                         R218 (0R) ---> GND_CHASSIS</pre>
            <p>Single-point star grounding: AGND &rarr; DGND &rarr; PGND. GND_CHASSIS is the PE/safety earth net (mounting holes H1-H5).</p>
        `
    },
    {
        id: "digital-io",
        title: "10. Opto-Isolated Digital I/O & Field Isolation (ECO-031)",
        html: `
            <h4>Overview</h4>
            <p>6&times; 6N137S-TA1-L optocouplers (C92651, SOP-8, 3.3V native) provide galvanically isolated digital I/O for limit switches and pulse command inputs.</p>
            <h4>Field Isolation (ECO-031)</h4>
            <p><strong>B0503S-1WR3</strong> (U35, C5369462) isolated DC-DC creates FIELD_VCC/FIELD_GND from +5V rail (1500VDC isolation).</p>
            <ul>
                <li><strong>DI optos:</strong> LED side = FIELD domain (FIELD_VCC/FIELD_GND), output side = MCU domain (+3V3_D/DGND)</li>
                <li><strong>DO opto:</strong> LED side = MCU domain, output side = FIELD domain</li>
            </ul>
            <h4>Channel Assignments</h4>
            <table>
                <tr><th>Signal</th><th>MCU Pin</th><th>AIO #</th><th>Path</th></tr>
                <tr><td>LIMIT_SW_A</td><td>C4 (pin 17)</td><td>AIO239</td><td>DI &rarr; TZ + XINT1</td></tr>
                <tr><td>LIMIT_SW_B</td><td>C1 (pin 29)</td><td>AIO238</td><td>DI &rarr; TZ + XINT2</td></tr>
                <tr><td>HOME_SW</td><td>C14 (pin 44)</td><td>AIO246</td><td>DI &rarr; XINT3</td></tr>
                <tr><td>STEP_IN</td><td>A1/AIO232 (pin 22)</td><td>AIO232</td><td>Pulse DI &rarr; CLB (QepOnClb)</td></tr>
                <tr><td>DIR_IN</td><td>B3/AIO242 (pin 8)</td><td>AIO242</td><td>Pulse DI &rarr; CLB</td></tr>
                <tr><td>DIO_OUT_B</td><td>GPIO9 (pin 90)</td><td>&mdash;</td><td>DO (dedicated)</td></tr>
            </table>
            <p>All DI via GPHAMSEL + Input X-BAR. Limit switches route to ePWM Trip Zone for hardware-level PWM shutdown (&lt;1 PWM cycle). Pulse inputs are NO debounce (pulse-optimized) and route to CLB for hardware pulse counting at &gt;1 MHz.</p>
            <p><strong>Pull-ups:</strong> 3.3k&Omega; (C22978) on all 6N137 outputs &mdash; within datasheet 330&Omega;&ndash;4k&Omega; range.</p>
        `
    },
    {
        id: "chassis-pe",
        title: "11. Chassis/PE Ground Architecture (ECO-029)",
        html: `
            <h4>GND_CHASSIS Net</h4>
            <ul>
                <li>H1&ndash;H4 (MountingHole_3.2mm_M3_Pad) on GND_CHASSIS</li>
                <li>H5 (MountingHole_4.3mm_M4_Pad) &mdash; dedicated PE chassis stud for ring-terminal bonding</li>
                <li>R218 (0&Omega; 0603) net-tie couples PGND &harr; GND_CHASSIS at single defined point</li>
            </ul>
            <h4>Shield Drain Pads (ECO-029b)</h4>
            <p>TP1 (encoder J4), TP2 (Hall J8), TP3 (CAN J6), TP4 (motor J2) &mdash; all on GND_CHASSIS for cable shield termination.</p>
            <h4>Applicability</h4>
            <p>Conditional on product class. Class I (metal enclosure, PE conductor): mandatory. Class II (double-insulated): not required. Open-frame: optional.</p>
            <p><strong>Note:</strong> R218 is a PCB grounding strategy tie, NOT a safety fault-current conductor. PE fault current path is through chassis hardware (H5 stud, mounting bolts, enclosure PE bus).</p>
        `
    },
    {
        id: "limitations",
        title: "12. Known Limitations & Honest Assessment",
        html: `
            <table>
                <tr><th>Limitation</th><th>Assessment</th><th>Mitigation</th></tr>
                <tr><td>TVS D1 clamping at surge: 103V vs 100V MOSFET abs-max</td><td>3V margin is tight</td><td>D184 (SMDJ58A) provides local 93.6V clamp below abs-max</td></tr>
                <tr><td>Brake resistor: 35W at 139W peak = 25% duty max</td><td>Adequate for intermittent braking</td><td>Firmware 200ms ON + 2s cooldown; J18 for external resistor</td></tr>
                <tr><td>CSA thermal drift: &plusmn;450 &micro;V over 30&deg;C</td><td>Mitigated by NTC + firmware</td><td>Requires firmware compensation + thermal characterization</td></tr>
                <tr><td>Motor fuses F2/F3/F4: 60VDC rating at 60V bus</td><td>Zero VDC margin</td><td>Acceptable for prototype; verify interrupt capacity</td></tr>
                <tr><td>F1 fuse: conditionally acceptable</td><td>OK if PSCC &lt; 400A, Icont &lt; 15A</td><td>Production: verify PSCC from actual supply</td></tr>
                <tr><td>L5 (12V inductor) load budget</td><td>Typical 0.28A, max 1.6A exceeds Irms</td><td>Total +12V must stay &lt;1A; upgrade path documented</td></tr>
                <tr><td>PCB layout not started</td><td>Schematic complete, ERC clean</td><td>Layout review pending</td></tr>
                <tr><td>2N7002 GL clamp SOA</td><td>0.35W pkg may see 2-6W transient</td><td>Verify pulsed SOA; BSS138 as margin upgrade</td></tr>
            </table>
            <p><em>We invite the reviewer to challenge any of these assessments.</em></p>
        `
    }
];
