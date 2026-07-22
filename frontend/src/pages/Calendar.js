import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/MainLayout';
import { apiClient } from '../utils/api';
import { PageHeader, StatCard, EmptyState, Modal, Input, Select, Textarea, Button, Badge } from '../components/ui-kit';
import { Calendar as CalendarIcon, Plus, Clock, MapPin, Video, ChevronLeft, ChevronRight } from 'lucide-react';

export const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'meeting', location: '', meeting_link: '',
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    status: 'scheduled'
  });

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/events');
      setEvents(res.data.events || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createEvent = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await apiClient.post('/events', form);
      setShowModal(false);
      setForm({ title: '', description: '', event_type: 'meeting', location: '', meeting_link: '', start_time: new Date().toISOString().slice(0, 16), end_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16), status: 'scheduled' });
      fetchEvents();
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Failed to create event');
    } finally { setSubmitting(false); }
  };

  const today = new Date();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();
  const calendarDays = [];
  for (let i = 0; i < startDayOfWeek; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const upcomingEvents = events.filter(e => new Date(e.start_time) >= today).sort((a, b) => new Date(a.start_time) - new Date(b.start_time)).slice(0, 5);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Calendar"
          description="Manage events, meetings, and schedules"
          action={
            <Button onClick={() => setShowModal(true)} data-testid="create-event-button">
              <Plus className="mr-2 inline h-5 w-5" /> New Event
            </Button>
          }
        />

        <div className="bento-grid">
          <StatCard title="Total Events" value={events.length} icon={CalendarIcon} />
          <StatCard title="This Month" value={events.filter(e => new Date(e.start_time).getMonth() === currentDate.getMonth()).length} icon={Clock} />
          <StatCard title="Upcoming" value={upcomingEvents.length} icon={Video} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">{monthName}</h2>
              <div className="flex gap-2">
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="rounded p-2 hover:bg-surface-elevated text-foreground" data-testid="prev-month">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button onClick={() => setCurrentDate(new Date())} className="rounded px-3 py-1 text-sm hover:bg-surface-elevated text-foreground">Today</button>
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="rounded p-2 hover:bg-surface-elevated text-foreground" data-testid="next-month">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {calendarDays.map((day, idx) => {
                const isToday = day && day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
                const hasEvent = day && events.some(e => {
                  const eDate = new Date(e.start_time);
                  return eDate.getDate() === day && eDate.getMonth() === currentDate.getMonth() && eDate.getFullYear() === currentDate.getFullYear();
                });
                return (
                  <div
                    key={idx}
                    className={`aspect-square flex items-center justify-center rounded-lg text-sm transition-colors ${
                      !day ? '' :
                      isToday ? 'bg-primary text-white font-medium' :
                      hasEvent ? 'bg-primary/10 text-primary font-medium border border-primary/30' :
                      'text-foreground hover:bg-surface-elevated cursor-pointer'
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <h3 className="font-semibold text-foreground">Upcoming Events</h3>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : upcomingEvents.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No upcoming events</p>
            ) : (
              <div className="mt-4 space-y-4" data-testid="events-list">
                {upcomingEvents.map((e) => (
                  <div key={e.event_id} className="border-l-2 border-primary pl-4" data-testid="event-item">
                    <p className="font-medium text-foreground">{e.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(e.start_time).toLocaleString()}
                    </p>
                    {e.location && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {e.location}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Event" size="lg">
          {error && <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
          <form onSubmit={createEvent} className="mt-6 space-y-4">
            <Input label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="event-title-input" />
            <Textarea label="Description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="event-description-input" />
            <Select label="Type" value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} options={[
              { value: 'meeting', label: 'Meeting' }, { value: 'deadline', label: 'Deadline' }, { value: 'reminder', label: 'Reminder' }
            ]} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Start Time" type="datetime-local" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} data-testid="event-start-input" />
              <Input label="End Time" type="datetime-local" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} data-testid="event-end-input" />
            </div>
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Input label="Meeting Link" value={form.meeting_link} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} />
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1" data-testid="submit-event-button">
                {submitting ? 'Creating...' : 'Create Event'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
};
