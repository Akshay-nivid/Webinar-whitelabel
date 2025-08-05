import React from 'react';
import { connect } from 'react-redux';
import axios from 'axios';
import moment from 'moment';
import { jitsiLocalStorage } from '@jitsi/js-utils';
import { translate, translateToHTML } from '../../base/i18n/functions';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';
import Icon from '../../base/icons/components/Icon';
import { IconWarning } from '../../base/icons/svg';
import Watermarks from '../../base/react/components/web/Watermarks';
import getUnsafeRoomText from '../../base/util/getUnsafeRoomText.web';
import SettingsButton from '../../settings/components/web/SettingsButton';
import { Modal, Box, Button, Typography, TextField, InputAdornment, IconButton } from '@mui/material';
import { SETTINGS_TABS } from '../../settings/constants';
import { toast } from 'react-toastify';
import { AbstractWelcomePage, IProps, _mapStateToProps } from './AbstractWelcomePage';

class WelcomePage extends AbstractWelcomePage<IProps> {

    _additionalContentRef: HTMLDivElement | null = null;
    _additionalToolbarContentRef: HTMLDivElement | null = null;
    _additionalCardRef: HTMLDivElement | null = null;
    _roomInputRef: HTMLInputElement | null = null;

    _additionalCardTemplate: HTMLTemplateElement | null = document.getElementById('welcome-page-additional-card-template') as HTMLTemplateElement;
    _additionalContentTemplate: HTMLTemplateElement | null = document.getElementById('welcome-page-additional-content-template') as HTMLTemplateElement;
    _additionalToolbarContentTemplate: HTMLTemplateElement | null = document.getElementById('settings-toolbar-additional-content-template') as HTMLTemplateElement;

    _API = 'http://localhost:4444';
    _user: any = JSON.parse(jitsiLocalStorage.getItem('user')) || {};

    static defaultProps = {
        _room: ''
    };


    constructor(props: IProps) {
        super(props);

        this.state = {
            ...this.state,
            generateRoomNames: interfaceConfig.GENERATE_ROOMNAMES_ON_WELCOME_PAGE,
            _open: false
        };

        this._handleModal = this._handleModal.bind(this);
        this._handleFecthMeetingDetail = this._handleFecthMeetingDetail.bind(this);
        this._onFormSubmit = this._onFormSubmit.bind(this);
        this._login = this._login.bind(this);
        this._handleChangeValue = this._handleChangeValue.bind(this);
        this._setAdditionalCardRef = this._setAdditionalCardRef.bind(this);
        this._setAdditionalContentRef = this._setAdditionalContentRef.bind(this);
        this._setRoomInputRef = this._setRoomInputRef.bind(this);
        this._setAdditionalToolbarContentRef = this._setAdditionalToolbarContentRef.bind(this);
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

    _handleModal() {
        this.setState((prevState: any) => ({
            _open: !prevState._open
        }));
    }
    _onFormSubmit(room?: string, event?: React.FormEvent) {
        event?.preventDefault();
        const trimmedRoom = room?.trim();
        if (!trimmedRoom) {
            return toast.error(this.props.t(`welcomepage.conferenceIDIsEmpty`));
        }
        const forbiddenChars = ['?', '&', ':', '\'', '/', '"', '%', '#', '.'];

        if (forbiddenChars.some(char => trimmedRoom.includes(char))) {
            return toast.error(this.props.t(`welcomepage.roomNameAllowedChars`))
        }

        axios.get(`${this._API}/api/event/details/${trimmedRoom}`)
            .then(({ data }) => {
                const eventData = data;
                if (!eventData) return toast.error(this.props.t(`welcomepage.noData`));

                const now = moment();
                const { eventStartTime, eventEndTime, id } = eventData;
                this.setState({ ...this.state, eventId: id });

                // if (moment(eventEndTime).isBefore(now)) {
                //     return toast.error(this.props.t(`welcomepage.eventInPast`))
                // }

                // if (moment(eventStartTime).isAfter(now)) {
                //     return toast.error(this.props.t(`welcomepage.eventInFuture`))
                // }
                if (this._user && this._user.id) {
                    this._handleFecthMeetingDetail(this._user.id);
                } else {
                    this._handleModal()
                }

            })
            .catch(err => {
                console.error('API error:', err);
                toast.error(`Something went wrong.`)
            });
    }

    _handleChangeValue(name: string, value: string) {
        this.setState(prev => ({
            ...prev, [name]: value,
            _errorMessage: {
                ...prev._errorMessage,
                [name]: ''
            }
        }));
    }

    _login() {
        try {
            let { username, password } = this.state;
            username = username?.trim();
            password = password?.trim();
            const errors: any = {};

            if (!username || username === '') {
                errors.username = 'Username is required';
            }

            if (!password || password === '') {
                errors.password = 'Password is required';
            }
            if (errors.username || errors.password) {
                this.setState({ _errorMessage: errors });
                return;
            }
            axios.post(`${this._API}/api/auth/login`, { username, password })
                .then(({ data }) => {
                    if (data.status == 'success') {
                        this.state._errorMessage = { username: '', password: '' };
                        jitsiLocalStorage.setItem('user', JSON.stringify(data.data));
                        this._handleFecthMeetingDetail(data.data.id);
                    }
                })
                .catch(err => {
                    console.error('Login error:', err);
                    toast.error(err.response?.data?.message || 'Something went wrong.');
                });

        } catch (e) {
            console.error('Login error:', e);
            toast.error(`Something went wrong.`)
        }
    }
    _handleFecthMeetingDetail(userId: string) {
        try {
            axios.get(`${this._API}/api/event/meta?userId=${userId}&eventId=${this.state.eventId}`)
                .then(({ data }) => {
                    super._handleFecthMeetingDetail(data?.meetingUniqueId || '');
                    if (!this._roomInputRef || this._roomInputRef.reportValidity()) {
                        this._onJoin();
                    }
                })
                .catch((err) => { toast.error(`Something went wrong,please contact administrator.`) });

        } catch (e) {
            console.error('Fetch meeting detail error:', e);
            toast.error(`meeting detail not found.`)
        }
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
                            <Watermarks defaultJitsiLogoURL={DEFAULT_WELCOME_PAGE_LOGO_URL} noMargins />
                        </div>

                        <div className="welcome-page-settings">
                            <SettingsButton defaultTab={SETTINGS_TABS.CALENDAR} isDisplayedOnWelcomePage />
                            {this._shouldShowAdditionalToolbarContent() && (
                                <div className="settings-toolbar-content" ref={this._setAdditionalToolbarContentRef} />
                            )}
                        </div>

                        <h3 className="header-text-title">{t('welcomepage.headerTitle')}</h3>
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
            <>
                <div id="enter_room" style={{ borderRadius: '30px' }}>
                    <div className="join-meeting-container">
                        <div className="enter-room-input-container">
                            <form>
                                <input
                                    className="enter-room-input"
                                    placeholder="enter conference code"
                                    type="text"
                                    value={this.state.conferenceCode}
                                    onChange={(e) => this._handleChangeValue('conferenceCode', e.target?.value)}
                                    ref={this._setRoomInputRef}
                                    autoFocus
                                    aria-label="Meeting name input"
                                />
                            </form>
                        </div>
                        <button
                            className="welcome-page-button"
                            onClick={(e) => this._onFormSubmit(this.state.conferenceCode, e)}
                            type="button"
                        >
                            {t('welcomepage.startMeeting')}
                        </button>
                    </div>
                </div>
                <Modal
                    open={this.state._open}
                    onClose={this._handleModal}
                    aria-labelledby="modal-modal-title"
                    aria-describedby="modal-modal-description"
                >
                    <Box sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 400,
                        height: 205,
                        bgcolor: 'background.paper',
                        border: '2px solid #000',
                        boxShadow: 24,
                        borderRadius: "8px",
                        p: 4
                    }}>
                        <Typography id="modal-modal-title" variant="h6" component="h2" sx={{ fontWeight: "400px" }}>
                            Sign in
                        </Typography>
                        <Box
                            component="form"
                            noValidate
                            autoComplete="off"
                            sx={{
                                m: 1,
                                height: 167,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-around',
                                alignItems: 'center',
                                mt: 1
                            }}
                        >
                            <TextField
                                id="field-1"
                                label="Username"
                                variant="outlined"
                                size="small"
                                onChange={(e) => this._handleChangeValue('username', e?.target?.value)}
                                sx={{
                                    '& .MuiInputBase-input': {
                                        fontSize: 14,
                                    },
                                    '& .MuiInputLabel-root': {
                                        fontSize: 14,
                                    },
                                    '& .MuiFormHelperText-root': {
                                        fontSize: 12,
                                    }
                                }}
                                fullWidth
                                error={this.state._errorMessage.username !== ''}
                                helperText={this.state._errorMessage.username || ""}
                            />

                            <TextField
                                id="field-2"
                                label="Password"
                                variant="outlined"
                                size="small"
                                sx={{
                                    '& .MuiInputBase-input': {
                                        fontSize: 14,
                                    },
                                    '& .MuiInputLabel-root': {
                                        fontSize: 14,
                                    },
                                    '& .MuiFormHelperText-root': {
                                        fontSize: 12,
                                    }
                                }}
                                type={this.state._show ? 'text' : 'password'}
                                fullWidth
                                onChange={(e) => this._handleChangeValue('password', e?.target?.value)}
                                error={this.state._errorMessage.password !== ''}
                                helperText={this.state._errorMessage.password || ''}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label={this.state._show ? 'Hide password' : 'Show password'}
                                                // onClick={() => this.state._show = !this.state._show}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onMouseUp={(e) => e.preventDefault()}
                                            >
                                                {this.state._show ? <MdVisibility onClick={() => this.state._show = false} /> : <MdVisibilityOff onClick={() => this.state._show = true} />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />


                            <Button
                                variant="contained" onClick={this._login} sx={{ height: 43 }} fullWidth>Enter Meeting</Button>
                        </Box>

                    </Box>
                </Modal>
            </>
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
