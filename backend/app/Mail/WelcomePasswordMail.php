<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomePasswordMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public string $name, public string $password) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Bem-vindo ao Pragma - A tua senha temporária',
        );
    }

    public function content(): Content
    {
        return new Content(
            text: 'emails.welcome_password',
        );
    }
}