class DoorPackageCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._hass = null;
    this._pin = '';
    this._renderDebounceTimeout = null;
    this._lastRender = 0;
    this._lastState = null;

    const style = document.createElement('style');
    style.textContent = this.getStyles();
    this.shadowRoot.appendChild(style);

    this._mainContainer = document.createElement('div');
    this.shadowRoot.appendChild(this._mainContainer);

    this._modalContainer = document.createElement('div');
    this._modalContainer.className = 'modal-container';
    this.shadowRoot.appendChild(this._modalContainer);

    this.handlePinInput = this.handlePinInput.bind(this);
    this.toggleModal = this.toggleModal.bind(this);
    this.openGate = this.openGate.bind(this);
    this.toggleNotification = this.toggleNotification.bind(this);
    this.updateNotificationTime = this.updateNotificationTime.bind(this);
  }

  setConfig(config) {
    if (!config.smartlock && !config.gate && !config['building-door']) {
      throw new Error("Devi configurare almeno una delle entità: smartlock, gate o building-door");
    }
    this._config = config;
    this.render();
  }

  connectedCallback() {
    if (super.connectedCallback) super.connectedCallback();
    this.render();
  }

  disconnectedCallback() {
    if (this._renderDebounceTimeout) {
      clearTimeout(this._renderDebounceTimeout);
    }
    if (super.disconnectedCallback) super.disconnectedCallback();
  }

  set hass(hass) {
    if (!this._config) return;

    const newState = this._config.sensor && hass.states[this._config.sensor]
      ? JSON.stringify(hass.states[this._config.sensor])
      : '';

    const newFeedback = (hass.states['input_text.pin_feedback'] && hass.states['input_text.pin_feedback'].state) || '----';

    const stateChanged = this._lastState !== newState;
    const feedbackChanged = this._pinFeedback !== newFeedback;

    this._hass = hass;
    this._pinFeedback = newFeedback;

    if (!stateChanged && !feedbackChanged) return;

    this._lastState = newState;

    const now = Date.now();
    const shouldDebounce = now - this._lastRender < 100;

    const update = () => {
      this._lastRender = Date.now();
      this.render();
      if (this._modalContainer.style.display === 'block') {
        this._updatePinModal();
      }
    };

    if (shouldDebounce) {
      if (this._renderDebounceTimeout) clearTimeout(this._renderDebounceTimeout);
      this._renderDebounceTimeout = setTimeout(update, 100);
    } else {
      update();
    }
  }

  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object }
    };
  }

  getDoorState() {
    if (!this._config.sensor) return '--';
    const sensor = this._hass.states[this._config.sensor];
    if (!sensor) return '--';
    return sensor.state === 'on' ? 'APERTA' : 'CHIUSA';
  }

  getLastOpenTime() {
    const lastOpen = this._hass.states['input_datetime.last_door_open'];
    return lastOpen && lastOpen.state
      ? new Date(lastOpen.state).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '--:--';
  }

  getSmartLockState() {
    const id = this._config.smartlock;
    const state = id && this._hass.states[id] && this._hass.states[id].state;
    return state === 'unlocked' ? 'Sbloccato/a' : 'Bloccato/a';
  }

  getGateState() {
    const gate = this._config.gate && this._hass.states[this._config.gate];
    return gate && gate.state === 'unlocked' ? 'Sbloccato/a' : 'Bloccato/a';
  }

  getBuildingDoorState() {
    const door = this._config['building-door'] && this._hass.states[this._config['building-door']];
    return door ? door.state : '--';
  }

  handlePinInput(event) {
    const value = event.target.dataset.value;
    if (!this._hass || !value) return;

    const pinEntity = 'input_text.pin_digitale';

    if (value === 'C') {
      this._pin = '';
      this._hass.callService('input_text', 'set_value', {
        entity_id: pinEntity,
        value: ''
      });
      this._updatePinModal();
    }

    else if (value === 'OK') {
      this._hass.callService('input_text', 'set_value', {
        entity_id: pinEntity,
        value: this._pin
      });

      this._hass.callService('script', 'turn_on', {
        entity_id: 'script.package_porta_pin'
      });

      this._pin = '';
    }

    else if (this._pin.length < 4) {
      this._pin += value;
      this._hass.callService('input_text', 'set_value', {
        entity_id: pinEntity,
        value: this._pin
      });
      this._updatePinModal();
    }
  }

  toggleModal(type) {
    if (type) {
      const settings = this.getSettingsData();
      const pinFeedback = this._hass.states['input_text.pin_feedback']?.state || '----';
      const snapshotPath = this._hass.states['input_text.snapshot_path_frontend']?.state;

      this._modalContainer.innerHTML = this.renderModal(type, pinFeedback, settings, snapshotPath);
      this._modalContainer.style.display = 'block';

      if (type === 'pin') {
        this._modalContainer.querySelectorAll('.key').forEach(btn => {
          btn.addEventListener('click', this.handlePinInput);
        });
      }
    } else {
      this._modalContainer.innerHTML = '';
      this._modalContainer.style.display = 'none';
      this._pin = '';
      if (this._hass) {
        this._hass.callService('input_text', 'set_value', {
          entity_id: 'input_text.pin_digitale',
          value: ''
        });
      }
    }
  }

  renderModal(type, pinFeedback, settings, snapshotPath) {
    return `
      <div class="modal-overlay" onclick="this.getRootNode().host.toggleModal(null)">
        <div class="popup-content" onclick="event.stopPropagation()">
          ${this.getModalContent(type, pinFeedback, settings, snapshotPath)}
          <button class="chiudi" onclick="this.getRootNode().host.toggleModal(null)">✖</button>
        </div>
      </div>
    `;
  }

  getStyles() {
    return `
      :host {
        --card-primary-color: var(--primary-color, #03a9f4);
      }

      .card {
        width: 100%;
        height: 80%;
        max-width: 450px;
        padding: 24px;
        background: linear-gradient(145deg, #2d3748, #1a1f2c);
        border-radius: 30px;
        box-shadow:
          0 25px 50px -12px rgba(0, 0, 0, 0.5),
          0 0 0 1px rgba(255, 255, 255, 0.1) inset,
          0 0 30px rgba(120, 130, 255, 0.05) inset;
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(20px);
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 32px;
        flex-wrap: wrap;
      }

      .info {
        flex: 1;
        min-width: 140px;
      }

      .titolo {
        font-size: clamp(12px, 3vw, 18px);
        font-weight: 600;
        background: linear-gradient(to right, #fff, #e2e8f0);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 8px;
        letter-spacing: -0.5px;
      }

      .stato {
        font-size: clamp(13px, 3vw, 15px);
        color: #a0aec0;
        font-weight: 500;
        letter-spacing: 0.5px;
        opacity: 0.9;
      }

      .apertura {
        font-size: clamp(13px, 3vw, 15px);
        color: #a0aec0;
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
        padding: 10px 20px;
        border-radius: 16px;
        white-space: nowrap;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .azioni {
        display: flex;
        gap: 12px;
      }

      .azioni button {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
        border: 1px solid rgba(255, 255, 255, 0.1);
        font-size: clamp(20px, 4vw, 22px);
        color: #e2e8f0;
        cursor: pointer;
        width: clamp(0px, 8vw, 45px);
        height: clamp(40px, 8vw, 45px);
        border-radius: 14px;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        display: grid;
        place-items: center;
        box-shadow:
          0 4px 12px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      }

      .azioni button:hover {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
        transform: translateY(-3px);
        box-shadow:
          0 8px 20px rgba(0, 0, 0, 0.15),
          0 0 0 1px rgba(255, 255, 255, 0.1) inset;
      }

      .contenuto {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 32px;
      }

      .img-porta {
        width: clamp(180px, 40vw, 240px);
        aspect-ratio: 1 / 1;
        border-radius: 24px;
        box-shadow:
          0 25px 50px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.1) inset;
        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        cursor: pointer;
        object-fit: cover;
      }

      .img-porta:hover {
        transform: scale(1.03) translateY(-5px);
        box-shadow:
          0 35px 70px rgba(0, 0, 0, 0.4),
          0 0 0 1px rgba(255, 255, 255, 0.15) inset,
          0 0 30px rgba(120, 130, 255, 0.1);
      }

      .pulsanti-laterali {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .btn {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
        color: #e2e8f0;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 18px;
        padding: clamp(14px, 3vw, 18px);
        font-size: clamp(14px, 3vw, 16px);
        text-align: left;
        min-width: clamp(130px, 25vw, 150px);
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow:
          0 4px 12px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        letter-spacing: 0.3px;
      }

      .btn:hover {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
        transform: translateY(-3px);
        box-shadow:
          0 8px 20px rgba(0, 0, 0, 0.15),
          0 0 0 1px rgba(255, 255, 255, 0.1) inset;
      }

      .btn small {
        display: block;
        color: #a0aec0;
        margin-top: 6px;
        font-size: clamp(12px, 2.5vw, 14px);
        letter-spacing: 0.2px;
        opacity: 0.9;
      }

      .modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(8px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      }

      .popup-content {
        background: linear-gradient(145deg, #2d3748, #1a1f2c);
        padding: clamp(28px, 5vw, 36px);
        border-radius: 30px;
        text-align: center;
        color: #fff;
        width: 90% !important;
        max-width: 300px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow:
          0 25px 50px rgba(0, 0, 0, 0.3),
          0 0 30px rgba(120, 130, 255, 0.05) inset;
        position: relative;
      }

      .popup-content h3 {
        font-size: clamp(20px, 4vw, 24px);
        margin: 0 0 24px 0;
        color: #fff;
        letter-spacing: -0.5px;
        font-weight: 600;
      }

      .photo {
        width: 100%; /* L'immagine occupa tutta la larghezza disponibile */
        object-fit: contain; /* Contiene l'immagine senza ritagliarla */
        border-radius: 20px;
        box-shadow:
          0 25px 50px rgba(0, 0, 0, 0.3),
          0 0 0 1px rgba(255, 255, 255, 0.1) inset;
      }



      .pin-feedback {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
        padding: clamp(14px, 3vw, 18px) clamp(20px, 4vw, 28px);
        border-radius: 18px;
        font-size: clamp(22px, 4vw, 26px);
        margin: 20px 0;
        min-height: 30px;
        min-width: clamp(160px, 30vw, 180px);
        color: #fff;
        font-family: monospace;
        letter-spacing: 6px;
        display: inline-block;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow:
          0 4px 12px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      }

      .pin-box {
        display: grid;
        grid-template-columns: repeat(3, minmax(65px, 75px));
        gap: 14px;
        justify-content: center;
        margin: 28px 0;
      }

      .pin-box button {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
        color: #fff;
        font-size: clamp(20px, 4vw, 22px);
        height: clamp(48px, 10vw, 55px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow:
          0 4px 12px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      }

      .pin-box button:hover {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
        transform: translateY(-2px);
        box-shadow:
          0 8px 20px rgba(0, 0, 0, 0.15),
          0 0 0 1px rgba(255, 255, 255, 0.1) inset;
      }

      .blocca-btn {
        background: linear-gradient(145deg, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.1));
        color: #ef4444;
        font-weight: 600;
        padding: clamp(12px, 2.5vw, 14px) clamp(24px, 5vw, 28px);
        border-radius: 16px;
        cursor: pointer;
        margin: 20px auto;
        border: 1px solid rgba(239, 68, 68, 0.2);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: clamp(14px, 3vw, 15px);
        letter-spacing: 0.3px;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
      }

      .blocca-btn:hover {
        background: linear-gradient(145deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.15));
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(239, 68, 68, 0.15);
      }

      .chiudi {
        position: absolute;
        top: 20px;
        right: 20px;
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
        color: #fff;
        width: clamp(32px, 6vw, 36px);
        height: clamp(32px, 6vw, 36px);
        border-radius: 50%;
        border: 1px solid rgba(255, 255, 255, 0.1);
        cursor: pointer;
        display: grid;
        place-items: center;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        font-size: clamp(15px, 3vw, 17px);
        box-shadow:
          0 4px 12px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      }

      .chiudi:hover {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
        transform: scale(1.1);
        box-shadow:
          0 8px 20px rgba(0, 0, 0, 0.15),
          0 0 0 1px rgba(255, 255, 255, 0.1) inset;
      }

      .hidden {
        display: none;
      }

      .popup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 28px;
      }

      .popup-header h2 {
        margin: 0;
        font-size: clamp(20px, 4vw, 24px);
        font-weight: 600;
        color: #fff;
        letter-spacing: -0.5px;
      }

      .setting-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: clamp(14px, 3vw, 18px) 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        font-size: clamp(14px, 3vw, 15px);
        color: #e2e8f0;
        letter-spacing: 0.3px;
      }

      .setting-row:last-child {
        border-bottom: none;
      }

      .toggle-group {
        display: flex;
        align-items: center;
        gap: clamp(10px, 2vw, 14px);
      }

      input[type="time"] {
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        padding: clamp(8px, 1.5vw, 10px) clamp(12px, 2.5vw, 14px);
        border-radius: 12px;
        font-size: clamp(14px, 3vw, 15px);
        box-shadow:
          0 4px 12px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      }

      .switch {
        position: relative;
        display: inline-block;
        width: clamp(40px, 8vw, 44px);
        height: clamp(22px, 4.5vw, 24px);
      }

      .switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
        transition: 0.4s;
        border-radius: 34px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow:
          0 4px 12px rgba(0, 0, 0, 0.1),
          0 0 0 1px rgba(255, 255, 255, 0.05) inset;
      }

      .slider:before {
        position: absolute;
        content: "";
        height: calc(100% - 4px);
        width: calc(50% - 2px);
        left: 2px;
        bottom: 2px;
        background-color: #fff;
        transition: 0.4s;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      input:checked + .slider {
        background: linear-gradient(145deg, rgba(96, 165, 250, 0.3), rgba(96, 165, 250, 0.2));
        border-color: rgba(96, 165, 250, 0.4);
      }

      input:checked + .slider:before {
        transform: translateX(100%);
        background-color: #fff;
      }

      @media (max-width: 510px) {
        .card {
          padding: 2px 2px 2px;
          max-width: 350px;
          margin: 0 auto;  /* Centra la card orizzontalmente */
          overflow: hidden; /* Nasconde eventuali fuoriuscite */
        }

        .header {
          flex-direction: column;
          align-items: center;
          gap: 12px;
          text-align: center;
        }

        .info {
          width: 100%;
        }

        .azioni {
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
          width: 100%;
        }

        .azioni button {
          font-size: 24px;
          padding: 0;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #e2e8f0;
          cursor: pointer;
          border-radius: 14px;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow:
            0 4px 12px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        }

        .azioni button:hover {
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
          transform: translateY(-3px);
          box-shadow:
            0 8px 20px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(255, 255, 255, 0.1) inset;
        }

        .contenuto {
          flex-direction: column;
          align-items: center;
          gap: 24px;
        }

        .img-porta {
          width: 160px;
        }

        .pulsanti-laterali {
          flex-direction: row;
          justify-content: center;
          gap: 16px;
          margin-top: 12px;
          width: 100%;
        }

        .btn {
          flex: 1;
          text-align: center;
          min-width: auto;
        }

        .popup-buttons {
          flex-direction: column;
          gap: 12px;
        }

        .popup-buttons .btn {
          width: 100%;
        }
      }

      @media (max-width: 350px) {
        .header {
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 10px;
        }
        .card {
          padding: 2px 2px 2px;
          max-width: 250px;
          margin: 0 auto;  /* Centra la card orizzontalmente */
          overflow: hidden; /* Nasconde eventuali fuoriuscite */
        }
        .apertura {
          width: 100%;
          box-sizing: border-box;
        }

        .azioni {
          justify-content: center;
          width: 100%;
          gap: 8px;
        }

        .azioni button {
          width: 42px;
          height: 42px;
          font-size: 22px;
        }
      }

    `;
  }

  getModalContent(type, pinFeedback, settings, snapshotPath) {
    if (type === 'gate') {
      return `
        <h3>Vuoi aprire il portone?</h3>
        <div class="popup-buttons">
          <button class="btn" onclick="this.getRootNode().host.toggleModal(null)">❌ Annulla</button>
          <button class="btn" onclick="this.getRootNode().host.openEntity('${this._config.gate}')">✅ Ok</button>
        </div>
      `;
    }
    if (type === 'building') {
      return `
        <h3>Vuoi aprire il cancello?</h3>
        <div class="popup-buttons">
          <button class="btn" onclick="this.getRootNode().host.toggleModal(null)">❌ Annulla</button>
          <button class="btn" onclick="this.getRootNode().host.openEntity('${this._config['building-door']}')">✅ Ok</button>
        </div>
      `;
    }

    if (type === 'pin') {
      return `
        <h3>🔢 Inserisci PIN</h3>
        <div class="pin-feedback" style="${this.getPinFeedbackStyle(pinFeedback)}">
          ${pinFeedback === '----'
            ? (this._pin.length > 0 ? '•'.repeat(this._pin.length) : '----')
            : pinFeedback}
        </div>
        <div class="pin-box">
          ${[1,2,3,4,5,6,7,8,9,'C',0,'OK'].map(num => `
            <button class="key" data-value="${num}">${num}</button>
          `).join('')}
        </div>
        <button class="blocca-btn"
          style="${this.getPinFeedbackStyle(pinFeedback)}"
          onclick="
            this.getRootNode().host._hass.callService('script', 'turn_on', {
              entity_id: 'script.blocca_porta_feedback'
            });
            setTimeout(() => {
              this.getRootNode().host._updatePinModal();
            }, 600);
          ">
          🔒 Premi per bloccare 🔒
        </button>
      `;
    }

    if (type === 'snapshot') {
      return `
        <h3>Ultimo Snapshot</h3>
        <img class="photo" src="${snapshotPath || 'img/snapshot.jpg'}" alt="Snapshot" />
      `;
    }

    if (type === 'settings') {
      return `
        <div class="popup-header">
          <h2>Impostazioni</h2>
        </div>
        <div class="setting-row">
          <span>🕒 Orologio</span>
          <span>${settings.time}</span>
        </div>
        <div class="setting-row">
          <span>📅 Data</span>
          <span>${settings.date}</span>
        </div>
        <div class="setting-row">
          <span>💬 Notifiche</span>
          <div class="toggle-group">
            <label>TELEGRAM</label>
            <label class="switch">
              <input type="checkbox"
                ${settings.telegramNotify ? 'checked' : ''}
                onchange="this.getRootNode().host.toggleNotification('telegram')"
              >
              <span class="slider round"></span>
            </label>
            <label>HA</label>
            <label class="switch">
              <input type="checkbox"
                ${settings.haNotify ? 'checked' : ''}
                onchange="this.getRootNode().host.toggleNotification('ha')"
              >
              <span class="slider round"></span>
            </label>
          </div>
        </div>
        <div class="setting-row">
          <span>⏰ Dalle</span>

          <input type="time"

            value="${settings.startTime}"
            onchange="this.getRootNode().host.updateNotificationTime('start', this.value)"
          >
        </div>
        <div class="setting-row">
          <span>⏰ Alle</span>
          <input type="time"
            value="${settings.endTime}"
            onchange="this.getRootNode().host.updateNotificationTime('end', this.value)"
          >
        </div>
      `;
    }

    return `<p>Errore: tipo modal sconosciuto</p>`;
  }

  openEntity(entityId) {
    if (!this._hass || !entityId) return;

    const domain = entityId.split('.')[0];
    const service = {
      script: { service: 'turn_on' },
      lock: { service: 'unlock' },
      switch: { service: 'toggle' },
      input_boolean: { service: 'toggle' },
      cover: { service: 'open_cover' }
    }[domain];

    if (service) {
      this._hass.callService(domain, service.service, { entity_id: entityId });
    } else {
      console.warn(`[DoorPackageCard] Nessun handler per l'entità ${entityId}`);
    }

    this.toggleModal(null);
  }

  openGate() {
    this.openEntity(this._config.gate);
  }

  getSettingsData() {
    return {
      time: this._hass.states['sensor.time']?.state || '--:--',
      date: this._hass.states['sensor.date']?.state || '----',
      telegramNotify: this._hass.states['input_boolean.notify_telegram_porta']?.state === 'on',
      haNotify: this._hass.states['input_boolean.notify_push_porta']?.state === 'on',
      startTime: this._hass.states['input_datetime.orario_inizio_notifiche_porta']?.state || '07:00',
      endTime: this._hass.states['input_datetime.orario_fine_notifiche_porta']?.state || '22:00'
    };
  }

  toggleNotification(type) {
    const entity = type === 'telegram' ? 'input_boolean.notify_telegram_porta' : 'input_boolean.notify_push_porta';
    this._hass.callService('input_boolean', 'toggle', {
      entity_id: entity
    });
  }

  updateNotificationTime(type, time) {
    const entity = type === 'start'
      ? 'input_datetime.orario_inizio_notifiche_porta'
      : 'input_datetime.orario_fine_notifiche_porta';

    this._hass.callService('input_datetime', 'set_datetime', {
      entity_id: entity,
      time: time
    });
  }

  _updatePinModal() {
    this._modalContainer.innerHTML = this.renderModal(
      'pin',
      this._pinFeedback,
      this.getSettingsData(),
      this._hass.states['input_text.snapshot_path_frontend']?.state
    );

    this._modalContainer.querySelectorAll('.key').forEach(btn => {
      btn.addEventListener('click', this.handlePinInput);
    });
  }

  getPinFeedbackStyle(feedback) {
    if (feedback === 'APERTO') return 'color: lime;';
    if (feedback === 'BLOCCATO') return 'color: orange;';
    if (feedback === 'ERRATO') return 'color: red; animation: blink 1s infinite;';
    return 'color: white;';
  }

  render() {
    if (!this._config || !this._hass) return;

    const doorState = this.getDoorState();
    const lastOpen = this.getLastOpenTime();
    const smartlock = this.getSmartLockState();
    const gate = this.getGateState();
    const buildingDoor = this.getBuildingDoorState();

    const buttons = [];

    if (this._config.smartlock) {
      buttons.push(`
        <button class="btn" onclick="this.getRootNode().host.toggleModal('pin')">
          🔓 Serratura
          <small>${smartlock}</small>
        </button>
      `);
    }

    if (this._config.gate) {
      buttons.push(`
        <button class="btn" onclick="this.getRootNode().host.toggleModal('gate')">
          🟧 Portone
          <small>${gate}</small>
        </button>
      `);
    }

    if (this._config['building-door']) {
      buttons.push(`
        <button class="btn" onclick="this.getRootNode().host.toggleModal('building')">
          🚪 Cancello
          <small>${buildingDoor}</small>
        </button>
      `);
    }

    const newContent = `
      <ha-card>
        <div class="card">
          <div class="header">
            <div class="info">
              <div class="titolo">Porta Ingresso</div>
              <div class="stato" style="color: ${doorState === 'APERTA' ? '#ef4444' : '#a0aec0'}">
                ${doorState === '--' ? 'Stato porta non disponibile' : doorState === 'APERTA' ? 'Aperta' : 'Chiusa'}
              </div>
            </div>
            <div class="apertura">Ultima apertura: ${lastOpen}</div>
            <div class="azioni">
              <button onclick="this.getRootNode().host.toggleModal('snapshot')">🖼️</button>
              <button onclick="this.getRootNode().host.toggleModal('settings')">⚙️</button>
            </div>
          </div>

          <div class="contenuto">
            <img
              class="img-porta"
              src="/local/community/ha-card-porta-ingresso/porta-${doorState.toLowerCase()}.png"
              alt="Stato Porta"
            />
            <div class="pulsanti-laterali">
              ${buttons.join('')}
            </div>
          </div>
        </div>
      </ha-card>
    `;

    if (this._mainContainer.innerHTML !== newContent) {
      this._mainContainer.innerHTML = newContent;
    }
  }
}

// Register the custom element
customElements.define('door-package-card', DoorPackageCard);

// Add card to window.customCards
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'door-package-card',
  name: 'Door Package Card',
  description: 'Una card moderna per controllare porta e portone'
});

