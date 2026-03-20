const POWER_STAGE_ARCHITECTURE = [
    {
        id: "system-context",
        title: "1. System Context",
        html: `
            <h4>What This Drive Does</h4>
            <p>The ServoDriverTI is a 3-phase FOC servo controller for driving ironless linear motors. The design targets high-precision current control with low noise and low drift.</p>
            <h4>Design Requirements</h4>
            <ul>
                <li><strong>STO (Safe Torque Off)</strong> per IEC 61800-5-2</li>
                <li><strong>CE EMC compliance</strong> per EN 61800-3</li>
                <li><strong>Full FOC source code access</strong> on the MCU</li>
            </ul>
            <h4>Electrical Operating Point</h4>
            <table>
                <tr><th>Parameter</th><th>Value</th></tr>
                <tr><td>DC bus voltage</td><td>24-60V (nominal 48V)</td></tr>
                <tr><td>Continuous phase current</td><td>5A</td></tr>
                <tr><td>Peak phase current</td><td>15-20A (short duration)</td></tr>
                <tr><td>PWM frequency</td><td>20-45 kHz (center-aligned, complementary)</td></tr>
                <tr><td>Motor type</td><td>3-phase ironless linear (low inductance)</td></tr>
                <tr><td>Current sensing</td><td>3× low-side shunt + DRV8353 CSA</td></tr>
            </table>
        `
    },
    {
        id: "mosfets",
        title: "2. Why These MOSFETs (CSD19535KCS)",
        html: `
            <p>We chose the <strong>CSD19535KCS</strong> (100V, 5 mΩ Rds(on), D2PAK) for the 3-phase half-bridge:</p>
            <ul>
                <li><strong>Voltage margin:</strong> 100V rating on a 60V bus gives 40V margin for inductive spikes during rapid current reversal.</li>
                <li><strong>Conduction losses are trivial:</strong> At 5A continuous, total loss across all 6 MOSFETs is P = 6 × 25 × 0.005 = 0.75W. At 15A peak, 6.75W.</li>
                <li><strong>TI ecosystem:</strong> Used in TI's motor control reference designs — proven compatibility with the DRV8353.</li>
                <li><strong>Why not GaN/SiC:</strong> At 60V/5A/45 kHz, silicon MOSFETs are the correct technology. GaN adds complexity with marginal switching-loss benefit at these operating conditions.</li>
            </ul>
        `
    },
    {
        id: "gate-driver",
        title: "3. Why DRV8353SRTAR (Gate Driver + Integrated CSA)",
        html: `
            <p>The DRV8353 provides <strong>three functions in one IC</strong>:</p>
            <ol>
                <li><strong>Gate driver</strong> (100V, configurable drive strength, dead-time insertion)</li>
                <li><strong>3× current-sense amplifiers</strong> (5/10/20/40 V/V gain, SPI configurable)</li>
                <li><strong>Protection</strong> (OCP via VDS monitoring, UVLO, overtemperature, fault reporting)</li>
            </ol>
            <h4>The Tradeoff We Accepted</h4>
            <p>The DRV8353 CSA has ±15 µV/°C offset drift. Over a 30°C excursion, this produces ±450 µV drift (±9 mA phantom current at 50 mV/A sensitivity). We mitigate with:</p>
            <ul>
                <li><strong>Mandatory NTC</strong> (TH1, 10K B3435) near shunt resistors, read by MCU ADC</li>
                <li><strong>Firmware temperature compensation</strong> using NTC readings</li>
                <li><strong>ADS7056 fallback ADCs</strong> (14-bit, DNP) if needed</li>
            </ul>
        `
    },
    {
        id: "shunt-topology",
        title: "4. Why 3-Shunt Topology",
        html: `
            <p>We use <strong>3 independent low-side shunt resistors</strong> (5 mΩ each) with Kelvin sense connections.</p>
            <h4>Why Not 2-Shunt</h4>
            <p>2-shunt sensing has measurement dead zones at low duty cycles, creating current reconstruction artifacts that appear as torque ripple. For precision current control, any reconstruction artifact directly becomes a force disturbance.</p>
            <h4>Shunt Value: 5 mΩ</h4>
            <ul>
                <li>At 5A: signal = 25 mV → CSA output: 250 mV swing from bias</li>
                <li>At 15A peak: 1.125W dissipation (within 2512 rating)</li>
                <li>If more resolution needed: increase CSA gain to 20 V/V via SPI — no hardware change</li>
            </ul>
        `
    },
    {
        id: "input-protection",
        title: "5. Input Protection Architecture",
        html: `
            <p>Layered defense strategy:</p>
            <pre>DC Input → Fuse → Crowbar diode → CMC → Diff inductor → Bulk caps → Inverter
                                                                 │
                                                          TVS (SMCJ64A)</pre>
            <h4>Each Layer's Purpose</h4>
            <ul>
                <li><strong>20A Fuse:</strong> Ultimate overcurrent protection</li>
                <li><strong>Crowbar Diode (D9, MBR30100CT):</strong> Reverse polarity — short-circuits and blows fuse instead of destroying electronics</li>
                <li><strong>TVS (SMCJ64A):</strong> Surge transient protection. 64V standoff on 60V bus — only 4V margin. We kept SMCJ64A because SMDJ70A/75A clamping voltages exceed 100V abs-max of MOSFETs</li>
                <li><strong>CMC + Diff Inductor:</strong> Conducted EMC compliance (EN 61800-3)</li>
                <li><strong>Bulk Caps:</strong> 2× 2200µF/160V + 2.2µF film for energy storage and HF decoupling</li>
                <li><strong>Pre-charge:</strong> Limits inrush to prevent welding connector contacts</li>
            </ul>
        `
    },
    {
        id: "brake-chopper",
        title: "6. Brake Chopper Design",
        html: `
            <p>During deceleration, the linear motor regenerates energy back into the DC bus. The hardware-autonomous brake chopper dissipates this energy.</p>
            <h4>Threshold Ordering (Critical)</h4>
            <table>
                <tr><th>Voltage</th><th>Event</th></tr>
                <tr><td>60V</td><td>Normal bus operation</td></tr>
                <tr><td>64V</td><td>SMCJ64A TVS standoff (no conduction)</td></tr>
                <tr><td>65.5V</td><td>Brake chopper ON (hardware, dissipates energy)</td></tr>
                <tr><td>62.5V</td><td>Brake chopper OFF (hysteresis)</td></tr>
                <tr><td>67.8V</td><td>OVP latch (hardware, disables gate drive)</td></tr>
                <tr><td>~71V</td><td>SMCJ64A breakdown (TVS absorbs remaining)</td></tr>
            </table>
            <p><strong>Why hardware, not firmware:</strong> Must work even if MCU has crashed. LM393 comparator + SCR latch + CSD19535KTT MOSFET + 33Ω/35W resistor.</p>
            <p><strong>Limitation:</strong> 35W resistor at 139W peak = 25% duty max. Single moves are fine; continuous rapid cycling needs characterization.</p>
        `
    },
    {
        id: "sto",
        title: "7. Safe Torque Off (3-Path STO)",
        html: `
            <p>IEC 61800-5-2 compliance requires redundant disable paths. We implemented 3 independent paths:</p>
            <ol>
                <li><strong>Path 1 — ENABLE Gating:</strong> DRV_ENABLE AND-gated with watchdog output (STWD100). MCU lockup → gate disable.</li>
                <li><strong>Path 2 — INH Gating:</strong> Four SN74LVC1G08 AND gates gate the INH signals to DRV8353. STO de-assert → INH forced low.</li>
                <li><strong>Path 3 — GL Clamp:</strong> Three MOSFETs (Q14/Q15/Q16) via U20 inverter independently clamp gate-low signals. Fully independent of DRV8353.</li>
            </ol>
            <p><strong>Why 3 paths, not 2:</strong> Paths 1 and 2 both involve the DRV8353 — a common-cause failure could defeat both. Path 3 is completely independent of the DRV8353 IC.</p>
            <p><strong>Monitoring:</strong> GPIO39/GPIO40 read back STO state. GPIO30/GPIO31 provide test pulse capability.</p>
        `
    },
    {
        id: "emc-output",
        title: "8. Motor Output EMC Filter",
        html: `
            <p><strong>Problem:</strong> Motor cables radiate PWM switching harmonics. CSD19535KCS switches at 5-20 V/ns, creating common-mode currents through parasitic capacitances.</p>
            <p><strong>Solution:</strong></p>
            <ul>
                <li><strong>3-phase CM choke (L_CM1):</strong> PDMFAT22148D-202MLB-6P, 9A rated, effective at 100 kHz-10 MHz</li>
                <li><strong>RC snubber footprints (DNP):</strong> 6× pairs (4.7Ω + 2.2nF), tuned during EMC pre-compliance testing</li>
            </ul>
            <p><strong>Why not dV/dt output filter:</strong> LC filter adds phase lag to the current loop — unacceptable for 20-45 kHz bandwidth. CM choke + snubbers achieves CE compliance with minimal control impact.</p>
        `
    },
    {
        id: "power-supply",
        title: "9. Power Supply Architecture",
        html: `
            <p>Three domains with decreasing noise:</p>
            <pre>VBUS (24-60V) → LM5164 (1.05 MHz buck) → 12V
    12V → TPS7A2033 (< 1 µVRMS LDO) → +3V3_A (analog, ADC, CSA)
    12V → TPS563200 (buck) → 5V (encoder)
    12V → [ferrite bead] → +3V3_D (digital MCU)</pre>
            <h4>Why Ultra-Low-Noise LDO</h4>
            <p>The TPS7A2033 achieves < 1 µVRMS output noise. At 50 mV/A current sensitivity, a 1 mV supply noise spike creates a 20 mA phantom current measurement. Precision current sensing requires supply noise well below ADC LSB.</p>
            <h4>Ground Domains</h4>
            <p>PGND, DGND, AGND connected at a single star point (R190, 0Ω) near shunt resistors / ADC reference. Prevents power-stage switching currents from contaminating the analog measurement path.</p>
        `
    },
    {
        id: "limitations",
        title: "10. Known Limitations & Honest Assessment",
        html: `
            <table>
                <tr><th>Limitation</th><th>Assessment</th><th>Mitigation</th></tr>
                <tr><td>TVS margin: 4V between 60V bus and 64V SMCJ64A</td><td>Acceptable if brake chopper engages first</td><td>Prototype surge testing (DEC-006)</td></tr>
                <tr><td>TVS clamping at surge: 103V vs 100V MOSFET abs-max</td><td>3V margin is tight</td><td>May need to limit bus to 55V nominal</td></tr>
                <tr><td>Brake resistor: 35W at 139W peak = 25% duty max</td><td>Adequate for intermittent braking</td><td>Higher wattage if continuous cycling required</td></tr>
                <tr><td>CSA thermal drift: ±450 µV over 30°C</td><td>Mitigated by NTC + firmware</td><td>Requires firmware compensation + thermal characterization</td></tr>
                <tr><td>PCB layout not started</td><td>Schematic complete, ERC clean</td><td>Layout review pending</td></tr>
            </table>
            <p><em>We invite the reviewer to challenge any of these assessments.</em></p>
        `
    }
];
