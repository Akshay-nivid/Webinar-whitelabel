import React from 'react';
import { connect } from 'react-redux';
import axios from 'axios';
import moment from 'moment';

import { isMobileBrowser } from '../../base/environment/utils';
import { translate, translateToHTML } from '../../base/i18n/functions';
import Icon from '../../base/icons/components/Icon';
import { IconWarning } from '../../base/icons/svg';
import Watermarks from '../../base/react/components/web/Watermarks';
import getUnsafeRoomText from '../../base/util/getUnsafeRoomText.web';
import CalendarList from '../../calendar-sync/components/CalendarList.web';
import RecentList from '../../recent-list/components/RecentList.web';
import SettingsButton from '../../settings/components/web/SettingsButton';
import { SETTINGS_TABS } from '../../settings/constants';
import { toast } from 'react-toastify';

import { AbstractWelcomePage, IProps, _mapStateToProps } from './AbstractWelcomePage';
import Tabs from './Tabs';

export const ROOM_NAME_VALIDATE_PATTERN_STR = '^[^?&:\u0022\u0027%#]+$';

class WelcomePage extends AbstractWelcomePage<IProps> {

    _additionalContentRef: HTMLDivElement | null = null;
    _additionalToolbarContentRef: HTMLDivElement | null = null;
    _additionalCardRef: HTMLDivElement | null = null;
    _roomInputRef: HTMLInputElement | null = null;

    _additionalCardTemplate: HTMLTemplateElement | null = document.getElementById('welcome-page-additional-card-template') as HTMLTemplateElement;
    _additionalContentTemplate: HTMLTemplateElement | null = document.getElementById('welcome-page-additional-content-template') as HTMLTemplateElement;
    _additionalToolbarContentTemplate: HTMLTemplateElement | null = document.getElementById('settings-toolbar-additional-content-template') as HTMLTemplateElement;

    _titleHasNotAllowCharacter = false;
    _isEmpty = false;
    _meetingError = false;
    _errorMessage = 'roomNameAllowedChars';
    _API = 'http://localhost:4444';

    static defaultProps = {
        _room: ''
    };

    constructor(props: IProps) {
        super(props);

        this.state = {
            ...this.state,
            generateRoomNames: interfaceConfig.GENERATE_ROOMNAMES_ON_WELCOME_PAGE
        };

        this._onFormSubmit = this._onFormSubmit.bind(this);
        this._onRoomChange = this._onRoomChange.bind(this);
        this._setAdditionalCardRef = this._setAdditionalCardRef.bind(this);
        this._setAdditionalContentRef = this._setAdditionalContentRef.bind(this);
        this._setRoomInputRef = this._setRoomInputRef.bind(this);
        this._setAdditionalToolbarContentRef = this._setAdditionalToolbarContentRef.bind(this);
        this._renderFooter = this._renderFooter.bind(this);
    }

    override componentDidMount() {
        super.componentDidMount();

        document.body.classList.add('welcome-page');
        document.title = interfaceConfig.APP_NAME;

        if (this.state.generateRoomNames) this._updateRoomName();

        this._maybeRenderTemplates();
    }

    override componentWillUnmount() {
        super.componentWillUnmount();
        document.body.classList.remove('welcome-page');
    }

    override render() {
        const { _moderatedRoomServiceUrl, t } = this.props;
        const { DEFAULT_WELCOME_PAGE_LOGO_URL, DISPLAY_WELCOME_FOOTER } = interfaceConfig;
        const showAdditionalContent = this._shouldShowAdditionalContent();
        const contentClassName = showAdditionalContent ? 'with-content' : 'without-content';
        const footerClassName = DISPLAY_WELCOME_FOOTER ? 'with-footer' : 'without-footer';

        return (
            <div className={`welcome ${contentClassName} ${footerClassName}`} id="welcome_page">
                <div className="header">
                    <div className="header-image" />
                    <div className="header-container">
                        <div className="header-watermark-container">
                            <Watermarks
                                defaultJitsiLogoURL={DEFAULT_WELCOME_PAGE_LOGO_URL}
                                noMargins
                            />
                        </div>

                        <div className="welcome-page-settings">
                            <SettingsButton
                                defaultTab={SETTINGS_TABS.CALENDAR}
                                isDisplayedOnWelcomePage
                            />
                            {this._shouldShowAdditionalToolbarContent() && (
                                <div
                                    className="settings-toolbar-content"
                                    ref={this._setAdditionalToolbarContentRef}
                                />
                            )}
                        </div>

                        <h1 className="header-text-title">{t('welcomepage.headerTitle')}</h1>
                        <span className="header-text-subtitle">{t('welcomepage.headerSubtitle')}</span>

                        {this._renderRoomInput()}
                        {this._renderInsecureRoomNameWarning()}

                        {_moderatedRoomServiceUrl && (
                            <div id="moderated-meetings">
                                {translateToHTML(t, 'welcomepage.moderatedMessage', {
                                    url: _moderatedRoomServiceUrl
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    _renderRoomInput() {
        const { t } = this.props;

        return (
            <div id="enter_room" style={{ borderRadius: '30px' }}>
                <div className="join-meeting-container" style={{ borderRadius: '30px' }}>
                    <div className="enter-room-input-container">
                        <form>
                            <input
                                className="enter-room-input"
                                placeholder="Enter conference ID"
                                pattern={ROOM_NAME_VALIDATE_PATTERN_STR}
                                type="text"
                                value={this.state.room}
                                onChange={this._onRoomChange}
                                ref={this._setRoomInputRef}
                                autoFocus
                                aria-label="Meeting name input"
                                style={{ borderRadius: '30px', border: '1px solid white' }}
                            />
                        </form>
                    </div>
                    <button
                        className="welcome-page-button"
                        onClick={(e) => this._onFormSubmit(this.state.room, e)}
                        style={{ borderRadius: '30px' }}
                        type="button"
                    >
                        {t('welcomepage.startMeeting')}
                    </button>
                </div>
            </div>
        );
    }

    override _doRenderInsecureRoomNameWarning() {
        return (
            <div className="insecure-room-name-warning">
                <Icon src={IconWarning} />
                <span>{getUnsafeRoomText(this.props.t, 'welcome')}</span>
            </div>
        );
    }

    _maybeRenderTemplates() {
        if (this._shouldShowAdditionalContent()) {
            this._additionalContentRef?.appendChild(
                this._additionalContentTemplate?.content.cloneNode(true) as Node
            );
        }

        if (this._shouldShowAdditionalToolbarContent()) {
            this._additionalToolbarContentRef?.appendChild(
                this._additionalToolbarContentTemplate?.content.cloneNode(true) as Node
            );
        }

        if (this._shouldShowAdditionalCard()) {
            this._additionalCardRef?.appendChild(
                this._additionalCardTemplate?.content.cloneNode(true) as Node
            );
        }
    }

    _clearErrorState() {
        this._meetingError = false;
        this._isEmpty = false;
        this._errorMessage = 'roomNameAllowedChars';
        this.forceUpdate();
    }

    _setErrorState(message: string) {
        this._meetingError = true;
        this._isEmpty = message === 'conferenceIDIsEmpty';
        this._errorMessage = message;

        toast.error(this.props.t(`welcomepage.${message}`));

        setTimeout(() => {
            this._clearErrorState();
        }, 3000);

        this.forceUpdate();
    }

    _onFormSubmit(room: string, event?: React.FormEvent) {
        event?.preventDefault();
        const trimmedRoom = room.trim();

        if (!trimmedRoom) {
            this._setErrorState('conferenceIDIsEmpty');
            return;
        }

        axios.get(`${this._API}/api/event/details/${trimmedRoom}`)
            .then(({ data }) => {
                const eventData = data;
                if (!eventData) return this._setErrorState('noData');

                const now = moment();
                const { eventStartTime, eventEndTime } = eventData;

                if (moment(eventEndTime).isBefore(now)) {
                    return this._setErrorState('eventInPast');
                }

                if (moment(eventStartTime).isAfter(now)) {
                    return this._setErrorState('eventInFuture');
                }

                this._clearErrorState();

                if (!this._roomInputRef || this._roomInputRef.reportValidity()) {
                    this._onJoin();
                }
            })
            .catch(err => {
                console.error('API error:', err);
                this._setErrorState('apiError');
            });
    }

    _onRoomChange(event: React.ChangeEvent<HTMLInputElement>) {
        const forbiddenChars = ['?', '&', ':', '\'', '"', '%', '#', '.'];
        this._titleHasNotAllowCharacter = forbiddenChars.some(char =>
            event.target.value.includes(char)
        );
        super._onRoomChange(event.target.value);
    }

    _renderTabs() {
        if (isMobileBrowser()) return null;

        const { _calendarEnabled, _recentListEnabled, t } = this.props;
        const tabs = [];

        if (_calendarEnabled) {
            tabs.push({ id: 'calendar', label: t('welcomepage.upcomingMeetings'), content: <CalendarList /> });
        }

        if (_recentListEnabled) {
            tabs.push({ id: 'recent', label: t('welcomepage.recentMeetings'), content: <RecentList /> });
        }

        return tabs.length ? <Tabs accessibilityLabel={t('welcomepage.meetingsAccessibilityLabel')} tabs={tabs} /> : null;
    }

    _renderFooter() {
        const {
            _deeplinkingCfg: {
                ios = { downloadLink: undefined },
                android = { fDroidUrl: undefined, downloadLink: undefined }
            }
        } = this.props;

    }

    _setAdditionalCardRef(el: HTMLDivElement) { this._additionalCardRef = el; }
    _setAdditionalContentRef(el: HTMLDivElement) { this._additionalContentRef = el; }
    _setAdditionalToolbarContentRef(el: HTMLDivElement) { this._additionalToolbarContentRef = el; }
    _setRoomInputRef(el: HTMLInputElement) { this._roomInputRef = el; }

    _shouldShowAdditionalCard() {
        return interfaceConfig.DISPLAY_WELCOME_PAGE_ADDITIONAL_CARD
            && this._additionalCardTemplate?.content
            && this._additionalCardTemplate?.innerHTML?.trim();
    }

    _shouldShowAdditionalContent() {
        return interfaceConfig.DISPLAY_WELCOME_PAGE_CONTENT
            && this._additionalContentTemplate?.content
            && this._additionalContentTemplate?.innerHTML?.trim();
    }

    _shouldShowAdditionalToolbarContent() {
        return interfaceConfig.DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT
            && this._additionalToolbarContentTemplate?.content
            && this._additionalToolbarContentTemplate?.innerHTML?.trim();
    }
}

export default translate(connect(_mapStateToProps)(WelcomePage));
