const SIGNAL_CHAIN_ARCHITECTURE = [
    {
        id: "central-challenge",
        title: "1. Design Priority: Current Measurement Precision",
        html: `
            <blockquote><strong>Position stability in a servo drive is dominated by current-loop quality &mdash; current measurement noise directly becomes force noise.</strong></blockquote>
            <p>Any error in current measurement creates a phantom force on the motor:</p>
            <pre>&Delta;I (amps) &times; Kf (N/A) / K_servo (N/m) = &Delta;x (meters)</pre>
            <p>This means <strong>every component in the current sensing signal chain directly impacts positioning performance.</strong> The design prioritizes low noise, low drift, and high resolution in the current measurement path.</p>
            <h4>&plusmn;20 nm Budget: Loop-Rate Filtering</h4>
            <p>Raw ADC quantization (32 nm/LSB) appears to exceed the budget, but the position loop low-pass filters current-loop quantization noise:</p>
            <ul>
                <li>Current loop: 20&ndash;45 kHz; Position loop: 0.5&ndash;2 kHz</li>
                <li>Effective reduction: &radic;(f_current / f_position) &asymp; &radic;20 &asymp; 4.5&times;</li>
                <li>Layer 1 (PGA bypass + 16&times; oversample): ~8 nm raw &rarr; ~2 nm effective</li>
                <li>Layer 2 (ADS7056 14-bit DNP): 4 nm raw &rarr; ~1 nm effective</li>
            </ul>
            <p><strong>Both layers fit the &plusmn;20 nm budget on the ADC axis</strong> (per DEC-001). Real open risks are: VREFHI bypass quality, CSA thermal compensation, HRPWM mandate, and motor-side EMC filter.</p>
        `
    },
    {
        id: "signal-flow",
        title: "2. Current Sensing Signal Chain: End-to-End",
        html: `
            <pre>Motor phase current (5A continuous, 15-20A peak)
  |
  v
3x 5 mOhm Kelvin shunt resistors (Inverter.kicad_sch)
  |  Signal: I x 5 mOhm = 25 mV at 5A, 75 mV at 15A
  v  (4-wire Kelvin connection, differential)
DRV8353 CSA inputs: SPx+ / SNx- (GateDriver.kicad_sch)
  |  22 Ohm input resistors (R37/R38 per phase)
  |  CSA gain: 10 V/V (configurable 5/10/20/40 via SPI)
  |  Output bias: 1.65V (VREF/2)
  |  Signal: 1.65V + I x 50 mV/A = 1.90V at 5A
  v
RC anti-alias filter (GateDriver.kicad_sch)
  |  100 Ohm + 2.2 nF (fc = 723 kHz)
  v
MCU ADC input pin (MCU.kicad_sch)
  |  Additional 2.2 nF C0G cap at MCU pin
  |  ADC: 12-bit SAR, 3.45 MSPS
  |  Triggered by ePWM at PWM midpoint
  v
Digital current value (firmware)
  |  Subtract boot-calibrated offset
  |  Apply NTC temperature compensation
  |  Optional: 16x burst oversampling</pre>
        `
    },
    {
        id: "shunt-rationale",
        title: "3. Why 5 mOhm Shunt Resistors",
        html: `
            <table>
                <tr><th>Shunt</th><th>Signal @ 5A</th><th>Signal @ 15A</th><th>Power @ 15A</th><th>CSA Out @ 5A</th></tr>
                <tr><td>2 mOhm</td><td>10 mV</td><td>30 mV</td><td>0.45W</td><td>1.75V</td></tr>
                <tr><td><strong>5 mOhm (selected)</strong></td><td><strong>25 mV</strong></td><td><strong>75 mV</strong></td><td><strong>1.125W</strong></td><td><strong>1.90V</strong></td></tr>
                <tr><td>10 mOhm</td><td>50 mV</td><td>150 mV</td><td>2.25W</td><td>2.15V</td></tr>
                <tr><td>20 mOhm</td><td>100 mV</td><td>300 mV</td><td>4.5W</td><td>2.65V</td></tr>
            </table>
            <p><strong>5 mOhm balances</strong> adequate signal level (310 ADC counts at 5A), manageable power (1.125W in 2512), and low self-heating (reduces thermal drift near precision measurement point).</p>
            <p><strong>Part:</strong> RALEC LR2512-23R005F4, 3W rating. At 20A peak: 2.0W (67% of rating).</p>
            <h4>Why Kelvin (4-Wire)</h4>
            <p>At 5 mOhm, the shunt voltage is only 25 mV at 5A. A 2 mOhm PCB trace resistance would create 40% error. Kelvin sensing uses separate trace pairs: current-carrying (wide) and sense (narrow, high-impedance to CSA only). All six sense lines assigned to Analog net class for matched PCB routing.</p>
        `
    },
    {
        id: "csa-rationale",
        title: "4. Why Integrated CSA (DRV8353) Instead of External",
        html: `
            <h4>What We Gain</h4>
            <ul>
                <li><strong>30 fewer components</strong> (vs 3&times; external INA240 + passives)</li>
                <li><strong>Matched channels</strong> (same die, track over temperature)</li>
                <li><strong>PWM noise rejection</strong> (built-in blanking windows)</li>
            </ul>
            <h4>What We Sacrifice</h4>
            <table>
                <tr><th>Parameter</th><th>DRV8353 CSA</th><th>External INA240A1</th></tr>
                <tr><td>Input offset</td><td>&plusmn;5 mV</td><td>&plusmn;25 &micro;V</td></tr>
                <tr><td>Thermal drift</td><td>&plusmn;15 &micro;V/&deg;C</td><td>&plusmn;0.25 &micro;V/&deg;C</td></tr>
                <tr><td>Drift over 30&deg;C</td><td><strong>&plusmn;450 &micro;V (&plusmn;9 mA)</strong></td><td>&plusmn;7.5 &micro;V (&plusmn;0.15 mA)</td></tr>
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
            <h4>Why It's Not Fatal (DEC-001 Resolution)</h4>
            <ol>
                <li><strong>Loop filtering effect:</strong> Position loop (0.5&ndash;2 kHz) averages over the current loop (20&ndash;45 kHz), reducing effective quantization noise by ~&radic;(f_current/f_position) &asymp; 4.5&times;. Raw 32 nm/LSB &rarr; ~5&ndash;8 nm effective.</li>
                <li><strong>Oversampling works:</strong> ADC at 3.45 MSPS gives 76 samples per PWM period. 16&times; oversample = +2 effective bits &rarr; ~4 mA/LSB (~8 nm raw &rarr; ~2 nm effective).</li>
                <li><strong>ADS7056 fallback:</strong> 3&times; 14-bit ADCs (DNP) provide ~2 mA/LSB (~4 nm raw &rarr; ~1 nm effective) if internal ADC proves insufficient.</li>
            </ol>
            <h4>PGA Complication</h4>
            <p>The MCU's PGA at 3&times; gain clips: 3 &times; 1.65V (CSA bias) = 4.95V &gt; 3.3V ADC rail. <strong>PGA bypass is the correct default.</strong> Pins are connected for future flexibility.</p>
            <h4>Caveats</h4>
            <ul>
                <li>Oversampling only buys effective bits if analog noise &ge; &frac12; LSB (dither). If chain is too quiet after VREFHI fix, 16&times; average gives same code.</li>
                <li>Encoder quantization (&plusmn;10 nm = half the budget) is structural and not filtered.</li>
                <li>Correlated low-frequency noise (bad VREFHI bypass, CSA thermal drift, mains pickup) is NOT filtered by the position loop.</li>
            </ul>
        `
    },
    {
        id: "filter-rationale",
        title: "6. Anti-Alias Filter Design",
        html: `
            <p>Per phase: <strong>100&Omega; + 2.2 nF C0G</strong>, fc = 723 kHz. Plus 2.2 nF C0G at MCU pin.</p>
            <ul>
                <li><strong>Above</strong> 2&times; current loop BW (90 kHz) &mdash; negligible phase lag</li>
                <li><strong>Below</strong> ADC Nyquist/2 (862 kHz) &mdash; meaningful alias rejection</li>
            </ul>
            <h4>Why C0G Capacitors</h4>
            <p>C0G has zero voltage coefficient (unlike X7R which loses 50-80% capacitance at rated voltage), zero aging, and low distortion. X7R in the anti-alias filter would create voltage-dependent filter corners that modulate the current measurement.</p>
            <h4>Why 100&Omega; (not 51&Omega;)</h4>
            <p>Higher resistance provides more filtering. The ADC acquisition time (Tacq) is configured to allow full settling through the 100&Omega; + 2.2 nF time constant (220 ns, 5&tau; = 1.1 &micro;s).</p>
        `
    },
    {
        id: "encoder-rationale",
        title: "7. Encoder Interface: AM26LV32EIDR + eQEP",
        html: `
            <h4>Why RS-422 Receiver (AM26LV32EIDR)</h4>
            <ul>
                <li><strong>Noise immunity:</strong> &gt; 40 dB common-mode rejection vs single-ended GPIO inputs. Essential near motor drive EMI.</li>
                <li><strong>Built-in open-circuit failsafe:</strong> AM26LV32E provides defined output on unplugged cable (revision notes removed short/terminated failsafe claims, so external biasing still important with termination).</li>
                <li><strong>Fast propagation:</strong> ~20 ns, &lt; 2 ns channel skew &mdash; accurate quadrature at high count rates.</li>
                <li><strong>Cable length:</strong> RS-422 supports long runs; our 1-3m cables are trivial.</li>
            </ul>
            <h4>Encoder Bias Network</h4>
            <p>R174&ndash;R179 (1k&Omega; pull-up/pull-down) + R21&ndash;R23 (120&Omega; termination) on ABZ pairs. With 3.3V, 1k/1k bias and 120&Omega; termination, external forced VID is ~187 mV (slightly below +200 mV threshold). Optional: reduce bias to 820&Omega; for more margin.</p>
            <h4>Hall Sensor Interface</h4>
            <ul>
                <li><strong>Pull-ups:</strong> R194&ndash;R196 (10k&Omega; to +3V3_D) on HALL_U/V/W_RAW &mdash; cable removal forces 111 (illegal state &rarr; fault)</li>
                <li><strong>Schmitt buffers:</strong> U24&ndash;U26 (SN74LVC1G17) after pull-ups &mdash; clean digital edges for commutation</li>
            </ul>
            <h4>Dual Encoder Paths</h4>
            <ul>
                <li><strong>Differential:</strong> J4 &rarr; AM26LV32EIDR &rarr; EQEP_A/B/I</li>
                <li><strong>Single-ended:</strong> J14 (direct EQEP_A/B/I, +5V, GND, +3V3_D) for single-ended encoders</li>
                <li><strong>Hall:</strong> J8 &rarr; separate feedback domain, not merged with encoder ABZ</li>
            </ul>
            <h4>Why eQEP Hardware Decode</h4>
            <p>At peak operating velocity with 20 nm resolution and 4&times; quadrature, the edge rate reaches tens of MHz. No ISR can sustain this. eQEP hardware counts without CPU involvement.</p>
        `
    },
    {
        id: "comms-rationale",
        title: "8. Communication Architecture",
        html: `
            <h4>USB-UART (CP2102N, U4)</h4>
            <p>Self-powered mode (VDD from +3V3_D). 22&Omega; series damping (0402) for USB signal integrity. J5 (USB Micro-B). Drive functions identically with or without USB connected.</p>
            <h4>RS-232 (MAX3232, U33 &mdash; NEW)</h4>
            <p>TSSOP-16, 3.3V RS-232 transceiver with internal charge pump. Shares MCU UART pins (GPIO28/29) with CP2102N.</p>
            <ul>
                <li><strong>TX path:</strong> MCU UART_TX &rarr; CP2102 RXD + MAX3232 T1IN (both high-Z inputs, safe to share)</li>
                <li><strong>RX path:</strong> R297 (0&Omega;, populated = USB) / R298 (0&Omega;, DNP = RS-232) &mdash; mutually exclusive jumper pair at UART_RX node</li>
                <li><strong>CRITICAL:</strong> R297 and R298 must NEVER both be populated (output contention between CP2102 TXD and MAX3232 R1OUT)</li>
                <li><strong>ESD:</strong> D182/D183 (PESD24VL1BA, 24V bidirectional) on RS232_TX/RS232_RX lines</li>
                <li><strong>Connector:</strong> J17 (Phoenix MCV 3-pin P3.50mm) &mdash; pin 1 TX, pin 2 RX, pin 3 GND</li>
                <li><strong>Charge pump caps:</strong> C212&ndash;C215 (100nF 0603), C216 VCC bypass</li>
            </ul>
            <h4>CAN (ISO1044BD, U23 &mdash; Isolated)</h4>
            <p><strong>Why isolated:</strong> Motor drive and CAN master may have different ground potentials. ISO1044BD + IA0505S isolated DC/DC provides full galvanic isolation (1000 VDC).</p>
            <ul>
                <li>J6 (Phoenix MCV 3-pin): CANH/CANL/GND</li>
                <li>R182 (120&Omega;) termination, populated</li>
                <li>D7/D8 (PESD12VL1BA, 12V) TVS protection</li>
                <li>CM choke on bus lines</li>
                <li>MCU GPIO32 (CAN_TX, MUX=6), GPIO33 (CAN_RX, MUX=6)</li>
            </ul>
            <p>Legacy SN65HVD232DR (U5) retained as DNP backup for bench testing.</p>
            <h4>Communication Summary</h4>
            <table>
                <tr><th>Interface</th><th>IC</th><th>Connector</th><th>Isolation</th><th>Status</th></tr>
                <tr><td>USB-UART</td><td>CP2102N (U4)</td><td>J5 Micro-B</td><td>No</td><td>Implemented</td></tr>
                <tr><td>RS-232</td><td>MAX3232 (U33)</td><td>J17 Phoenix 3-pin</td><td>No</td><td>Implemented</td></tr>
                <tr><td>CAN (isolated)</td><td>ISO1044BD (U23)</td><td>J6 Phoenix 3-pin</td><td>1000 VDC</td><td>Implemented</td></tr>
                <tr><td>CAN (backup)</td><td>SN65HVD232 (U5)</td><td>&mdash;</td><td>No</td><td>DNP</td></tr>
                <tr><td>JTAG</td><td>&mdash;</td><td>J3 (TI-14)</td><td>&mdash;</td><td>Implemented</td></tr>
                <tr><td>SPI-A (DRV8353)</td><td>&mdash;</td><td>Internal</td><td>&mdash;</td><td>Implemented</td></tr>
                <tr><td>SPI-B (ADS7056)</td><td>&mdash;</td><td>Internal</td><td>&mdash;</td><td>DNP</td></tr>
            </table>
        `
    },
    {
        id: "digital-io-signal",
        title: "9. Digital I/O Signal Path (Pulse Command & Limit Switches)",
        html: `
            <h4>AIO Digital Input Architecture</h4>
            <p>The F280049C supports AIO (Analog I/O) mode on ADC-associated pins (Port H, GPIO224-247), controlled by GPHAMSEL register. Digital input state accessible through Input X-BAR. <strong>Input only</strong> &mdash; no output drive capability.</p>
            <h4>Pulse Command Inputs (STEP/DIR)</h4>
            <ul>
                <li><strong>STEP_IN:</strong> 6N137 opto U31 &rarr; MCU A1/AIO232 (pin 22). No internal cap &rarr; clean for high-freq pulses.</li>
                <li><strong>DIR_IN:</strong> 6N137 opto U32 &rarr; MCU B3/AIO242 (pin 8). 100pF internal cap to VSSA (OK for slow DIR).</li>
                <li>Pulse-optimized: NO debounce caps on output side.</li>
                <li>Path: GPHAMSEL &rarr; Input X-BAR &rarr; CLB tile (QepOnClb library). STEP=clock, DIR=direction, 32-bit counter. Target &gt;1 MHz pulse rate.</li>
            </ul>
            <h4>Limit Switch Inputs</h4>
            <ul>
                <li>LIMIT_SW_A (AIO239, pin 17) &rarr; ePWM Trip Zone + XINT1</li>
                <li>LIMIT_SW_B (AIO238, pin 29) &rarr; ePWM Trip Zone + XINT2</li>
                <li>HOME_SW (AIO246, pin 44) &rarr; XINT3 only (no trip needed for homing)</li>
            </ul>
            <p>Trip Zone gives hardware-level instant PWM shutdown (&lt;1 PWM cycle latency, no firmware delay).</p>
        `
    },
    {
        id: "ground-strategy",
        title: "10. Ground Domain Strategy",
        html: `
            <table>
                <tr><th>Domain</th><th>Net</th><th>Purpose</th></tr>
                <tr><td>PGND</td><td>PGND</td><td>Power ground (MOSFET source, bus return, shunts)</td></tr>
                <tr><td>DGND</td><td>DGND</td><td>Digital ground (MCU, SPI, UART, CAN, GPIO)</td></tr>
                <tr><td>AGND</td><td>AGND</td><td>Analog ground (ADC reference, CSA, NTC)</td></tr>
                <tr><td>GND_CHASSIS</td><td>GND_CHASSIS</td><td>Safety earth / PE (mounting holes H1-H5, shield drain pads)</td></tr>
                <tr><td>FIELD_GND</td><td>FIELD_GND</td><td>Isolated field I/O ground (DigitalIO opto LED side)</td></tr>
                <tr><td>CAN_ISO_GND</td><td>CAN_ISO_GND</td><td>Isolated CAN bus ground (ISO1044BD secondary side)</td></tr>
            </table>
            <p><strong>Star grounding:</strong> AGND &rarr;[R190 0&Omega;]&rarr; DGND &rarr;[R50 0&Omega;]&rarr; PGND &rarr;[R218 0&Omega;]&rarr; GND_CHASSIS. R51 (AGND&rarr;PGND) = DNP debug-only bridge.</p>
            <p>If PGND and AGND shared a copper pour, switching current return paths would pass under ADC inputs, creating magnetic coupling that modulates current measurement.</p>
        `
    },
    {
        id: "error-budget",
        title: "11. Current Measurement Error Budget",
        html: `
            <p>The following table summarizes the electrical error sources in the current measurement path. The reviewer should verify these calculations.</p>
            <table>
                <tr><th>Source</th><th>Electrical Error</th><th>Effective (post-filter)</th><th>Notes</th></tr>
                <tr><td>ADC quantization (raw 12-bit)</td><td>16.1 mA/LSB (~32 nm)</td><td>~5-8 nm</td><td>Position loop filters broadband noise</td></tr>
                <tr><td>ADC quantization (16x OS)</td><td>~4 mA/LSB (~8 nm)</td><td>~2 nm</td><td>+2 effective bits from oversampling</td></tr>
                <tr><td>ADC quantization (ADS7056 14-bit)</td><td>~2 mA/LSB (~4 nm)</td><td>~1 nm</td><td>DNP fallback if internal ADC insufficient</td></tr>
                <tr><td>Encoder quantization</td><td>&plusmn;10 nm (half count)</td><td>&plusmn;10 nm (structural)</td><td>Fixed by encoder resolution (20 nm)</td></tr>
                <tr><td>CSA thermal drift (uncompensated)</td><td>&plusmn;9 mA (&plusmn;450 &micro;V)</td><td>NOT filtered (low-freq)</td><td>Dominant error. NTC target: &plusmn;2-3 mA</td></tr>
                <tr><td>PWM current ripple (45 kHz)</td><td>Vbus/(2&times;L&times;f_PWM)</td><td>&mdash;</td><td>Motor inductance dependent</td></tr>
                <tr><td>Power supply noise</td><td>&lt; 1 &micro;VRMS (&lt; 0.02 mA)</td><td>&mdash;</td><td>TPS7A2033 ultra-low-noise LDO</td></tr>
            </table>
            <p><strong>Key takeaway:</strong> CSA thermal drift (&plusmn;9 mA uncompensated) is the dominant error source. NTC compensation is the critical mitigation. ADC quantization fits the budget via loop filtering (DEC-001).</p>
        `
    },
    {
        id: "challenge-items",
        title: "12. What We Want the Reviewer to Challenge",
        html: `
            <ol>
                <li><strong>NTC compensation assumption:</strong> Can firmware reduce the &plusmn;9 mA CSA drift to &plusmn;2-3 mA? What thermal time constants and NTC placement issues might limit this?</li>
                <li><strong>Oversampling dithering:</strong> Does the analog noise floor provide sufficient dithering for 16&times; oversampling to gain 2 effective bits? If chain is too quiet after VREFHI fix, oversampling returns same code.</li>
                <li><strong>Anti-alias filter:</strong> Is 100&Omega; + 2.2 nF adequate? Better topology for this application?</li>
                <li><strong>PGA clipping:</strong> We identified that PGA 3&times; clips with DRV8353's 1.65V bias. Any configurations we missed?</li>
                <li><strong>Ground domain strategy:</strong> Is single-point R190 the right approach? What layout pitfalls to watch?</li>
                <li><strong>VREFHI bypass quality:</strong> Correlated low-frequency noise from bad VREFHI bypass is NOT filtered by position loop. Is the current R97=10&Omega; + decoupling adequate?</li>
                <li><strong>RS-232 RX mux:</strong> Is 0&Omega; jumper pair (R297/R298) safe enough, or should we use a 2:1 mux IC for runtime switching?</li>
                <li><strong>Field isolation budget:</strong> B0503S-1WR3 (1500 VDC) &mdash; adequate for industrial field wiring?</li>
                <li><strong>Anything we haven't thought of.</strong></li>
            </ol>
        `
    }
];
