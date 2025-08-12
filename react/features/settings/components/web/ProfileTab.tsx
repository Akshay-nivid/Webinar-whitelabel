import { Theme } from '@mui/material';
import React from 'react';
import { WithTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { withStyles } from 'tss-react/mui';

import { createProfilePanelButtonEvent } from '../../../analytics/AnalyticsEvents';
import { sendAnalytics } from '../../../analytics/functions';
import { IStore } from '../../../app/types';
import { login, logout } from '../../../authentication/actions.web';
import Avatar from '../../../base/avatar/components/Avatar';
import AbstractDialogTab, { IProps as AbstractDialogTabProps } from '../../../base/dialog/components/web/AbstractDialogTab';
import { translate } from '../../../base/i18n/functions';
import { withPixelLineHeight } from '../../../base/styles/functions.web';
import Button from '../../../base/ui/components/web/Button';
import Input from '../../../base/ui/components/web/Input';
import { jitsiLocalStorage } from '@jitsi/js-utils';

export interface IProps extends AbstractDialogTabProps, WithTranslation {
    authEnabled: boolean;
    authLogin: string;
    classes?: Partial<Record<keyof ReturnType<typeof styles>, string>>;
    dispatch: IStore['dispatch'];
    displayName: string;
    email: string;
    hideEmailInSettings?: boolean;
    id: string;
    readOnlyName: boolean;
}

interface IState {
    name: string;
    email: string;
    password: string;
}

const styles = (theme: Theme) => ({
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        width: '100%',
        padding: '0 2px'
    },
    avatarContainer: {
        display: 'flex',
        width: '100%',
        justifyContent: 'center',
        marginBottom: theme.spacing(4)
    },
    bottomMargin: {
        marginBottom: theme.spacing(4)
    },
    label: {
        color: `${theme.palette.text01} !important`,
        ...withPixelLineHeight(theme.typography.bodyShortRegular),
        marginBottom: theme.spacing(2)
    },
    name: {
        marginBottom: theme.spacing(1)
    }
});

class ProfileTab extends AbstractDialogTab<IProps, IState> {
    static defaultProps = {
        displayName: '',
        email: ''
    };

    private _user: any = JSON.parse(jitsiLocalStorage.getItem('user')) || null;

    constructor(props: IProps) {
        super(props);
        this._onAuthToggle = this._onAuthToggle.bind(this);
        this._onDisplayNameChange = this._onDisplayNameChange.bind(this);
        this._onEmailChange = this._onEmailChange.bind(this);

        this.state = {
            name: this._user ? `${this._user.firstName} ${this._user.lastName}` : '',
            email: this._user?.email || '',
            password: ''
        };
    }

    _onDisplayNameChange(field: keyof IState, value: string) {
        this.setState(prev => ({
            ...prev,
            [field]: value
        }));

        if (field === 'name') {
            super._onChange({ displayName: value });
        }else{
            super._onChange({ password: value });
        }

    }

    _onEmailChange(value: string) {
        this.setState({ email: value });
        super._onChange({ email: value });
    }

    override render() {
        const { authEnabled, hideEmailInSettings, id, t } = this.props;
        const { name, email, password } = this.state;
        const classes = withStyles.getClasses(this.props);

        return (
            <div className={classes.container}>
                <div className={classes.avatarContainer}>
                    <Avatar participantId={id} size={60} />
                </div>

                {/* Name input */}
                <Input
                    className={classes.bottomMargin}
                    readOnly={!!this._user}
                    id="setDisplayName"
                    label={this._user ? "Name" : "Username"}
                    name="name"
                    onChange={(value: string) => this._onDisplayNameChange('name', value)}
                    placeholder={this._user ? "Enter name" : "Enter username"}
                    type="text"
                    value={name}
                />

                {/* Password input if user not logged in */}
                {!this._user && (
                    <Input
                        className={classes.bottomMargin}
                        readOnly={false}
                        id="setPassword"
                        label="Password"
                        name="password"
                        onChange={(value: string) => this._onDisplayNameChange('password', value)}
                        placeholder="Enter password"
                        type="password"
                        value={password}
                    />
                )}

                {/* Email input only if logged in and not hidden */}
                {(!hideEmailInSettings && this._user) && (
                    <div className="profile-edit-field">
                        <Input
                            className={classes.bottomMargin}
                            id="setEmail"
                            readOnly={!!this._user}
                            label="Email"
                            name="email"
                            onChange={(value: string) => this._onEmailChange(value)}
                            placeholder={t('profile.setEmailInput')}
                            type="text"
                            value={email}
                        />
                    </div>
                )}

                {authEnabled && this._renderAuth()}
            </div>
        );
    }

    _onAuthToggle() {
        if (this._user) {
            sendAnalytics(createProfilePanelButtonEvent('logout.button'));
            this.props.dispatch(logout());
        } else {
            sendAnalytics(createProfilePanelButtonEvent('login.button'));
            this.props.dispatch(login());
        }
    }

    _renderAuth() {
        const { t } = this.props;
        const classes = withStyles.getClasses(this.props);

        return (
            <div>
                <h2 className={classes.label}>{t('toolbar.authenticate')}</h2>
                {this._user && (
                    <div className={classes.name}>
                        {t('settings.loggedIn', { name: `${this._user.firstName} ${this._user.lastName}` })}
                    </div>
                )}
                <Button
                    accessibilityLabel={this._user ? t('toolbar.logout') : t('toolbar.login')}
                    id="login_button"
                    label={this._user ? t('toolbar.logout') : t('toolbar.login')}
                    onClick={this._onAuthToggle}
                />
            </div>
        );
    }
}

export default withStyles(translate(connect()(ProfileTab)), styles);
