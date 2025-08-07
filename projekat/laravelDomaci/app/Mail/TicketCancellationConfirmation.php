<?php


namespace App\Mail;


use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use App\Models\Ticket;


class TicketCancellationConfirmation extends Mailable
{
    use Queueable, SerializesModels;


    public $ticket;
    public $refundInfo;


    public function __construct(Ticket $ticket, $refundInfo = [])
    {
        $this->ticket = $ticket;
        $this->refundInfo = $refundInfo;
    }


    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Potvrda otkazivanja karte - ' . $this->ticket->event->name,
        );
    }


    public function content(): Content
    {
        return new Content(
            view: 'emails.ticket-cancellation-confirmation',
            with: [
                'ticket' => $this->ticket,
                'event' => $this->ticket->event,
                'user' => $this->ticket->user,
                'refundInfo' => $this->refundInfo,
            ],
        );
    }


    public function attachments(): array
    {
        return [];
    }
}


