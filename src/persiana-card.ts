/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { RippleHandlers } from "@material/mwc-ripple/ripple-handlers";
import { Ripple } from '@material/mwc-ripple';
import { html, TemplateResult, css, PropertyValues, CSSResultGroup, LitElement } from 'lit';
import { HassEntity } from 'home-assistant-js-websocket'
import { queryAsync } from 'lit-element'
import { customElement, property, state } from "lit/decorators";
import { findEntities } from "./././find-entities";
import { ifDefined } from "lit/directives/if-defined";
import { classMap } from "lit/directives/class-map";
import { HomeAssistant, hasConfigOrEntityChanged, hasAction, ActionHandlerEvent, handleAction, LovelaceCardEditor, getLovelace, computeStateDomain } from 'custom-card-helpers';
import './editor';
import type { BoilerplateCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';
import { UNAVAILABLE } from "./data/entity";
import { fireEvent } from "custom-card-helpers";

const open_blind = "M.32 2.398c0 1.72.13 2.559.48 2.918.419.418.481 3.274.481 21.875V48.61h46.5V27.191c0-18.601.063-21.457.48-21.875.352-.359.481-1.199.481-2.918V0H.32ZM46.18 26.41v20.258H2.887V6.156H46.18Zm0 0";
const close_blind = "M3.848 26.09v18.957h41.367V7.129H3.848Zm0 0";

console.info(
  `%c  RACELAND-persiana-card \n%c  ${localize("common.version")} ${CARD_VERSION}`,
  'color: orange; font-weight: bold; background: black',
  'color: white; font-weight: bold; background: dimgray'
);

(window as any).customCards = (window as any).customCards || "", [];
(window as any).customCards.push({
  type: 'persiana-card',
  name: 'Persiana',
  preview: true,
  description: 'Uma carta que permite controlar persianas'
});
@customElement('persiana-card')
export class BoilerplateCard extends LitElement {
  supportsOpen: any;
  supportsStop: any;
  supportsClose: any;
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement('persiana-card-editor')
  }
  @queryAsync('mwc-ripple') private _ripple!: Promise<Ripple | null>;

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): BoilerplateCardConfig {
    const includeDomains = ["cover"];
    const maxEntities = 1;
    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains
    );
    return { type: "custom:persiana-card", entity: foundEntities[0] || "", "show_name": true, "show_state": true, "show_buttons": true, "show_preview": true, "icon": [open_blind, close_blind], "name": "Persiana" };
  }

  stateObj: { state: string; attributes: { assumed_state: any; }; };
  open_cover: any;
  stop_cover: any;
  close_cover: any;
  _entityObj: { open_cover: any; stop_cover: any; close_cover: any; supportsOpen: any; supportsStop: any; supportsClose: any; isFullyOpen: any; isOpening: any; isFullyClose: any; isClosing: any;};

  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private config!: BoilerplateCardConfig;

  public setConfig(config: BoilerplateCardConfig): void {
    if (!config) {
      throw new Error(localize('common.invalidconfiguration'));
    }
    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }
    this.config = {
      show_icon: true,
      icon: 'mdi:blinds',
      ...config,
      tap_action: {
        action: "toggle",
      },
      hold_action: {
        action: "more-info",
      },
    };
  }


  public translate_state(stateObj): string{
    if (ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "open") {
      return localize("states.on");
    }
    else if (ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "close") {
      return localize("states.off");
    }
    else if (ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "stop") {
      return localize("states.stop");
    }
    else if (ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "unavailable") {
      return localize("states.unavailable");
    }
    else {return ""}
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {return false}
      return hasConfigOrEntityChanged(this, changedProps, false);
    }

  protected renderSwitch(param): string {
    switch (param) {
      case 'foo': return 'bar';
      default: return 'foo';
    }
  }

  protected render(): TemplateResult | void {
    if (this.config.show_warning) {return this._showWarning(localize('common.show_warning'))}
    if (this.config.show_error) {return this._showError(localize('common.show_error'))}
    const stateObj = this.config.entity
      ? this.hass.states[this.config.entity]
      : undefined;

  return html`
    <ha-card
      class="hassbut ${classMap({
        "state-on":
          ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "on",
        "state-off":
          ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "off",
        "state-stop":
          ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "stop",
      })}"
        @action=${this._handleAction}
        @focus="${this.handleRippleFocus}"
        .actionHandler=${actionHandler({
          hasHold: hasAction(this.config.hold_action),
          hasDoubleClick: hasAction(this.config.double_tap_action),
        })}
        tabindex="0"
        .label=${`persiana: ${this.config.entity || 'No Entity Defined'}`}
    >

    ${this.config.show_icon
     ?this.renderIcon(stateObj)
     : ""
      ? html`
        <svg
          .actionHandler=${actionHandler({hasHold: hasAction(this.config.tap_action)})}
          tabindex="0">
        </svg>
      `:""
    }

    ${this.config.show_buttons
      ? html`
        <slot name="buttons_up">
          <button.mdc-icon-button-up
            class=${classMap({hidden: !this._entityObj?.supportsOpen})}
            .label=${this.hass.localize("ui.dialogs.more_info_control.opencover")}
            @click=${this.onOpenTap}
            .disabled=${this.computeOpenDisabled}
            title="Abrir">&#9650;
          </button.mdc-icon-button-up>
        </slot>
        <slot name="buttons_stop">
          <button.mdc-icon-button-stop
            class=${classMap({hidden: !this._entityObj?.supportsStop})}
            .label=${this.hass.localize("ui.dialogs.more_info_control.stopcover")}
            @click=${this.onStopTap}
            .disabled=${this.stateObj?.state === UNAVAILABLE}
            title="Parar">&#9724;
          </button.mdc-icon-button-stop>
        </slot>
        <slot name="buttons_down">
          <button.mdc-icon-button-down
            class=${classMap({hidden: !this._entityObj?.supportsClose})}
            .label=${this.hass.localize("ui.dialogs.more_info_control.closecover")}
            @click=${this.onCloseTap}
            .disabled=${this.computeCloseDisabled}
            title="Fechar">&#9660;
          </button.mdc-icon-button-down>
        </slot>
      `: ""
    }

    ${this.config.show_name
      ? html`
        <div tabindex = "-1" class="name-div">
          ${this.config.name}</div>
        <div></div>
      `: ""
    }

    ${this.config.show_state
      ? html`
        <div tabindex="-1" class="state-div">
          ${this.translate_state(stateObj)}
            <div class="position">
          </div></div>
      `: ""
    }
    </ha-card>
    `;
  }

  private renderIcon(stateObj) {
    if (typeof this.config.icon === "string") {
      return html`
        <ha-icon
          class="blind-icon ${classMap({
            "state-on":
              ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "on",
            "state-off":
              ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "off",
            "state-unavailable":
              ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "unavailable",
          })}"
          tabindex="-1"
          data-domain0${ifDefined(
          this.config.state_color && stateObj
            ? computeStateDomain(stateObj)
            : undefined
          )}
          data-state=${ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined)}
          .icon=${this.config.icon}>
        </ha-icon>`
    }
    else if (Array.isArray(this.config.icon) === true) {
      return html`
      <svg class="svgicon" viewBox="0 0 50 50" height="75%" width="65%">
        <path fill="#d3d3d3" d=${this.config.icon[0]} />
        <path class=${classMap({
          "state-on":
            ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "on",
          "state-off":
            ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "off",
          "state-unavailable":
            ifDefined(stateObj ? this.computeActiveState(stateObj) : undefined) === "unavailable",
        })}
        d=${this.config.icon[1]} />
      </svg>`
    }
    const svg = document.getElementById('svgicon');
    let startX, startY, elementX, elementY, element;
    svg.addEventListener('mousedown', e => {
      const className = svg.getAttributeNS(null, 'class');
      if (className.indexOf('draggable') >= 0) {
        startX = e.offsetX;
        startY = e.offsetY;
        element = e.target;
        elementX = +element.getAttributeNS(null, 'x');
        elementY = +element.getAttributeNS(null, 'y');
        svg.addEventListener('mousemove', this.onmousemove);
      }
    });
    onmousemove = e => {
      const x = e.offsetX;
      const y = e.offsetY;
      element.setAttributeNS(null, 'x', elementX + x - startX);
      element.setAttributeNS(null, 'y', elementY + y - startY);
    };
    svg.addEventListener('mouseup', _e => {
      svg.removeEventListener('mousemove', this.onmousemove);
    });
    return ""
  }

  private computeOpenDisabled(): boolean {
    if (this.open_cover?.state === UNAVAILABLE) {
      return true
    }
    const assumedState = this.open_cover?.attributes.assumed_state === true;
    return ((this._entityObj.isFullyOpen || this._entityObj.isOpening) && !assumedState);
  }

  private computeCloseDisabled(): boolean {
    if (this.stateObj?.state === UNAVAILABLE) {
      return true
    }
    const assumedState = this.stateObj?.attributes.assumed_state === true;
    return ((this._entityObj?.isFullyClose || this._entityObj?.isClosing) && !assumedState);
  }

  private onOpenTap(): void {
    this.hass.callService,({ entity_id: this?.supportsOpen });
  }

  private onStopTap(): void {
    this.hass.callService,({ entity_id: this?.supportsStop });
  }

  private onCloseTap(): void {
    this.hass.callService,({ entity_id: this?.supportsClose });
    //this.hass.callService('cover.close_cover', 'toggle', { entity_id: this?.stateObj });
  }

  private computeActiveState = (stateObj: HassEntity): string => {
    const domain = stateObj?.entity_id.split(".")[0];
    let state = stateObj?.state;
    if (domain === "climate") {state = stateObj?.attributes.hvac_action}
    return state;
  };

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action)
    }
  }

  private _showWarning(warning: string): TemplateResult {
    return html`<hui-warning>${warning}</hui-warning>`;
  }

  private _showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card');
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this.config,
    });
    return html`${errorCard}`;
  }

  private computeObjectId = (entityId: string): string => entityId.substr(entityId.indexOf(".") + 1);

  private computeStateName = (stateObj: HassEntity): string =>
    stateObj?.attributes.friendly_name === undefined
      ? this.computeObjectId(stateObj?.entity_id).replace(/_/g, " ")
      : stateObj?.attributes.friendly_name || "";

  private _rippleHandlers: RippleHandlers = new RippleHandlers(() => {
    return this._ripple
  });

  private handleRippleFocus() {
    this._rippleHandlers.startFocus()
  }

  private _handleMoreInfo() {
    fireEvent(this, "hass-more-info", {
      entityId: this.config?.entity
    })
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        cursor: pointer;
        display: grid;
        flex-direction: column;
        align-items: left;
        text-align: left;
        padding: 10% 10% 10% 10%;
        font-size: 18px;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        justify-content: left;
        position: relative;
        background: var(--card-color-background, rgba(53,53,53,0.9));
        color: var(--card-color-text, white);
        border-radius: 25px;
      }

      svg {
        cursor: row-resize;
        display: block;
        fill: #ffd580;
        .state-on {
          transform: scale(0);
        }
      }

      .more-info {
        position: absolute;
        cursor: pointer;
        top: 0;
        right: 0;
        color: var(--secondary-text-color);
        z-index: 1;
      }

      ha-icon {
        width: 70%;
        height: 80%;
        padding-bottom: 15px;
        margin: 0% 0% 0% 0%;
        color: var(--paper-item-icon-color, #fdd835);
        --mdc-icon-size: 100%;
      }

      ha-icon + span {
        text-align: left;
      }

      .buttons_up:hover{
        opacity: 0.7;
      }

      .buttons_stop:hover{
        opacity: 0.7;
      }

      .buttons_down:hover{
        opacity: 0.7;
      }

      span {
        margin: 5% 50% 1% 0%;
        padding: 0% 100% 1% 0%;
      }

      ha-icon,
      span {
        outline: none;
      }

      .state {
        margin: 0% 50% 5% 0%;
        padding: 0% 100% 5% 0%;
        text-align: left;
      }

      .hassbut.state-off {
        text-align: left;
      }

      .hassbut.state-on {
        text-align: left;
      }

      .hassbut {
        display: grid;
        grid-template-columns: 50% 16.6% 16.6% 16.6%;
      }

      .state-div {
        align-items: left;
        padding-top: 19px;
        padding-bottom: 6px;
      }

      .name-div {
        align-items: left;
        padding: 12% 100% 1% 0%;
      }

      .mdc-icon-button {
        padding: 6px 6px 6px 6px;
      }

      .mwc-icon-button {
        fill: #ffffff;
      }

      .ha-icon-button{
        cursor: pointer;
        fill: #ffffff;
        display: flex;
        visibility: visible;
      }

      mwc-list-item {
        cursor: pointer;
        white-space: nowrap;
      }

      .svgicon-blind {
        padding-bottom: 20px;
        max-width: 170px;
        transform: translate(62%, 55%) scale(2.5);
      }

      .svicon-shutter {
        padding-bottom: 20px;
        max-width: 170px;
        transform: translate(62%, 55%) scale(2.5);
      }

      .state {
        animation: state 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
      }

      .state-unavailable {
        color: var(--state-icon-unavailable-color, #bdbdbd);
      }

      :root {
        --main-color: bisque;
      }

      .opacity {
        animation: opacity 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both;
      }

      .reverse {
        animation-direction: reverse;
      }

      @keyframes state {
        0% {
          transform: none;
          fill: #9da0a2;
        }
        100% {
          transform: skewY(10deg) translate(4.5%, -3.9%) scaleX(0.8);
          fill: #b68349;
        }
      }

      @keyframes opacity {
        0% {
          opacity: 0;
        }
        100% {
          opacity: 1;
        }
      }
    `;
    }
}
