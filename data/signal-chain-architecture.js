const SIGNAL_CHAIN_ARCHITECTURE = [
    {
        id: "central-challenge",
        title: "1. Design Priority: Current Measurement Precision",
        html: `
            <blockquote><strong>Position stability in a servo drive is dominated by current-loop quality — current measurement noise directly becomes force noise.</strong></blockquote>
            <p>Any error in current measurement creates a phantom force on the motor:</p>
            <pre>ΔI (amps) × Kf (N/A) / K_servo (N/m) = Δx (meters)</pre>
            <p>This means <strong>every component in the current sensing signal chain directly impacts positioning performance.</strong> The design prioritizes low noise, low drift, and high resolution in the current measurement path.</p>
        `
    },
    {
        id: "signal-flow",
        title: "2. Current Sensing Signal Chain: End-to-End",
        html: `
            <pre>Motor phase current (5A continuous, 15-20A peak)
  │
  ▼
3× 5 mΩ Kelvin shunt resistors (Inverter.kicad_sch)
  │  Signal: I × 5 mΩ = 25 mV at 5A, 75 mV at 15A
  ▼  (4-wire Kelvin connection, differential)
DRV8353 CSA inputs: SPx+ / SNx- (GateDriver.kicad_sch)
  │  22Ω input resistors (R37/R38 per phase)
  │  CSA gain: 10 V/V (configurable 5/10/20/40 via SPI)
  │  Output bias: 1.65V (VREF/2)
  │  Signal: 1.65V + I × 50 mV/A = 1.90V at 5A
  ▼
RC anti-alias filter (GateDriver.kicad_sch)
  │  100Ω + 2.2 nF (fc = 723 kHz)
  ▼
MCU ADC input pin (MCU.kicad_sch)
  │  Additional 2.2 nF C0G cap at MCU pin
  │  ADC: 12-bit SAR, 3.45 MSPS
  │  Triggered by ePWM at PWM midpoint
  ▼
Digital current value (firmware)
  │  Subtract boot-calibrated offset
  │  Apply NTC temperature compensation
  │  Optional: 16× burst oversampling</pre>
        `
    },
    {
        id: "shunt-rationale",
        title: "3. Why 5 mΩ Shunt Resistors",
        html: `
            <table>
                <tr><th>Shunt</th><th>Signal @ 5A</th><th>Signal @ 15A</th><th>Power @ 15A</th><th>CSA Out @ 5A</th></tr>
                <tr><td>2 mΩ</td><td>10 mV</td><td>30 mV</td><td>0.45W</td><td>1.75V</td></tr>
                <tr><td><strong>5 mΩ ✓</strong></td><td><strong>25 mV</strong></td><td><strong>75 mV</strong></td><td><strong>1.125W</strong></td><td><strong>1.90V</strong></td></tr>
                <tr><td>10 mΩ</td><td>50 mV</td><td>150 mV</td><td>2.25W</td><td>2.15V</td></tr>
                <tr><td>20 mΩ</td><td>100 mV</td><td>300 mV</td><td>4.5W</td><td>2.65V</td></tr>
            </table>
            <p><strong>5 mΩ balances</strong> adequate signal level (310 ADC counts at 5A), manageable power (1.125W in 2512), and low self-heating (reduces thermal drift near precision measurement point).</p>
            <h4>Why Kelvin (4-Wire)</h4>
            <p>At 5 mΩ, the shunt voltage is only 25 mV at 5A. A 2 mΩ PCB trace resistance would create 40% error. Kelvin sensing uses separate trace pairs: current-carrying (wide) and sense (narrow, high-impedance to CSA only).</p>
        `
    },
    {
        id: "csa-rationale",
        title: "4. Why Integrated CSA (DRV8353) Instead of External",
        html: `
            <h4>What We Gain</h4>
            <ul>
                <li><strong>30 fewer components</strong> (vs 3× external INA240 + passives)</li>
                <li><strong>Matched channels</strong> (same die, track over temperature)</li>
                <li><strong>PWM noise rejection</strong> (built-in blanking windows)</li>
            </ul>
            <h4>What We Sacrifice</h4>
            <table>
                <tr><th>Parameter</th><th>DRV8353 CSA</th><th>External INA240A1</th></tr>
                <tr><td>Input offset</td><td>±5 mV</td><td>±25 µV</td></tr>
                <tr><td>Thermal drift</td><td>±15 µV/°C</td><td>±0.25 µV/°C</td></tr>
                <tr><td>Drift over 30°C</td><td><strong>±450 µV (±9 mA)</strong></td><td>±7.5 µV (±0.15 mA)</td></tr>
            </table>
            <p><strong>Why we accepted it:</strong> NTC compensation targets significant drift reduction. ADS7056 fallback exists on the board (DNP). Integrated CSA reduces BOM complexity. External CSAs can be added in a future revision if needed.</p>
        `
    },
    {
        id: "adc-rationale",
        title: "5. Why 12-bit ADC (and Why It's Not a Showstopper)",
        html: `
            <h4>The Apparent Problem</h4>
            <pre>12-bit over 3.3V = 0.806 mV/LSB
At 50 mV/A: 16.1 mA per LSB
Current resolution: 16.1 mA per LSB</pre>
            <p><strong>16.1 mA/LSB is coarse for precision current control.</strong></p>
            <h4>Why It's Not Fatal</h4>
            <ol>
                <li><strong>Loop filtering effect:</strong> Outer loops (1-5 kHz) average over the current loop (20-45 kHz), reducing effective quantization noise by ~sqrt(f_current/f_outer).</li>
                <li><strong>Oversampling works:</strong> ADC at 3.45 MSPS gives 76 samples per PWM period. 16× oversample = +2 effective bits → ~4 mA/LSB.</li>
                <li><strong>ADS7056 fallback:</strong> 3× 14-bit ADCs (DNP) provide ~2 mA/LSB if internal ADC proves insufficient.</li>
            </ol>
            <h4>PGA Complication</h4>
            <p>The MCU's PGA at 3× gain clips: 3 × 1.65V (CSA bias) = 4.95V > 3.3V ADC rail. <strong>PGA bypass is the correct default.</strong> Pins are connected for future flexibility.</p>
        `
    },
    {
        id: "filter-rationale",
        title: "6. Anti-Alias Filter Design",
        html: `
            <p>Per phase: <strong>100Ω + 2.2 nF C0G</strong>, fc = 723 kHz. Plus 2.2 nF C0G at MCU pin.</p>
            <ul>
                <li><strong>Above</strong> 2× current loop BW (90 kHz) — negligible phase lag</li>
                <li><strong>Below</strong> ADC Nyquist/2 (862 kHz) — meaningful alias rejection</li>
            </ul>
            <h4>Why C0G Capacitors</h4>
            <p>C0G has zero voltage coefficient (unlike X7R which loses 50-80% capacitance at rated voltage), zero aging, and low distortion. X7R in the anti-alias filter would create voltage-dependent filter corners that modulate the current measurement.</p>
            <h4>Why 100Ω (not 51Ω)</h4>
            <p>Higher resistance provides more filtering. The ADC acquisition time (Tacq) is configured to allow full settling through the 100Ω + 2.2 nF time constant (220 ns, 5τ = 1.1 µs).</p>
        `
    },
    {
        id: "encoder-rationale",
        title: "7. Encoder Interface: AM26LV32 + eQEP",
        html: `
            <h4>Why RS-422 Receiver (AM26LV32EIDR)</h4>
            <ul>
                <li><strong>Noise immunity:</strong> > 40 dB common-mode rejection vs single-ended GPIO inputs. Essential near motor drive EMI.</li>
                <li><strong>Fast propagation:</strong> ~20 ns, < 2 ns channel skew — accurate quadrature at high count rates.</li>
                <li><strong>Cable length:</strong> RS-422 supports long runs; our 1-3m cables are trivial.</li>
            </ul>
            <h4>Why 1K Failsafe Bias (not 390Ω)</h4>
            <p>Original 390Ω created ~440 mV differential offset with 120Ω termination, consuming excessive noise margin. 1K provides ~160 mV — sufficient failsafe with preserved noise margin.</p>
            <h4>Why eQEP Hardware Decode</h4>
            <p>At peak operating velocity with 20 nm resolution and 4× quadrature, the edge rate reaches tens of MHz. No ISR can sustain this. eQEP hardware counts without CPU involvement.</p>
        `
    },
    {
        id: "comms-rationale",
        title: "8. Communication Architecture",
        html: `
            <h4>USB-UART (CP2102N)</h4>
            <p>Self-powered mode (VDD from +3V3_D). 22Ω series damping (0402) for USB signal integrity. Drive functions identically with or without USB connected.</p>
            <h4>CAN (ISO1044BD, Isolated)</h4>
            <p><strong>Why isolated:</strong> Motor drive and CAN master may have different ground potentials. Without galvanic isolation, ground current flows through the CAN bus. ISO1044BD + IA0305S isolated DC/DC provides full galvanic isolation.</p>
            <p>Legacy SN65HVD232DR retained as DNP backup for bench testing.</p>
        `
    },
    {
        id: "ground-strategy",
        title: "9. Ground Domain Strategy",
        html: `
            <table>
                <tr><th>Domain</th><th>Net</th><th>Purpose</th></tr>
                <tr><td>PGND</td><td>PGND</td><td>Power ground (MOSFET source, bus return, shunts)</td></tr>
                <tr><td>DGND</td><td>DGND</td><td>Digital ground (MCU, SPI, UART, CAN, GPIO)</td></tr>
                <tr><td>AGND</td><td>AGND</td><td>Analog ground (ADC reference, CSA, NTC)</td></tr>
            </table>
            <p><strong>Single-point star connection</strong> via R190 (0Ω) near shunts/ADC reference. If PGND and AGND shared a copper pour, switching current return paths would pass under ADC inputs, creating magnetic coupling that modulates current measurement.</p>
        `
    },
    {
        id: "error-budget",
        title: "10. Current Measurement Error Budget",
        html: `
            <p>The following table summarizes the electrical error sources in the current measurement path. The reviewer should verify these calculations.</p>
            <table>
                <tr><th>Source</th><th>Electrical Error</th><th>Notes</th></tr>
                <tr><td>ADC quantization (raw 12-bit)</td><td>16.1 mA/LSB</td><td>At 5 mΩ shunt, 10 V/V CSA gain</td></tr>
                <tr><td>ADC quantization (16× OS)</td><td>~4 mA/LSB</td><td>+2 effective bits from oversampling</td></tr>
                <tr><td>ADC quantization (ADS7056 14-bit)</td><td>~2 mA/LSB</td><td>DNP fallback if internal ADC insufficient</td></tr>
                <tr><td>Encoder quantization</td><td>±10 nm (half count)</td><td>Fixed by encoder resolution (20 nm)</td></tr>
                <tr><td>CSA thermal drift (uncompensated, 30°C)</td><td>±9 mA (±450 µV)</td><td>Dominant error source</td></tr>
                <tr><td>CSA thermal drift (NTC compensated)</td><td>Target: ±2-3 mA</td><td>Requires firmware validation</td></tr>
                <tr><td>PWM current ripple (45 kHz)</td><td>Vbus/(2×L×f_PWM)</td><td>Motor inductance dependent</td></tr>
                <tr><td>Power supply noise</td><td>< 1 µVRMS (< 0.02 mA)</td><td>TPS7A2033 ultra-low-noise LDO</td></tr>
            </table>
            <p><strong>Key takeaway:</strong> CSA thermal drift (±9 mA uncompensated) is the dominant error source. NTC compensation is the critical mitigation.</p>
        `
    },
    {
        id: "challenge-items",
        title: "11. What We Want the Reviewer to Challenge",
        html: `
            <ol>
                <li><strong>NTC compensation assumption:</strong> Can firmware reduce the ±9 mA CSA drift to ±2-3 mA? What thermal time constants and NTC placement issues might limit this?</li>
                <li><strong>Oversampling assumption:</strong> Does the analog noise floor provide sufficient dithering for 16× oversampling to gain 2 effective bits?</li>
                <li><strong>Anti-alias filter:</strong> Is 100Ω + 2.2 nF adequate? Better topology for this application?</li>
                <li><strong>PGA clipping:</strong> We identified that PGA 3× clips with DRV8353's 1.65V bias. Any configurations we missed?</li>
                <li><strong>Ground domain strategy:</strong> Is single-point R190 the right approach? What layout pitfalls to watch?</li>
                <li><strong>Anything we haven't thought of.</strong></li>
            </ol>
        `
    }
];
